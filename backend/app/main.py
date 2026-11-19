import os, json, uuid, pickle, subprocess, sys
from pathlib import Path
from datetime import datetime, timezone
import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException, UploadFile, File, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from .db import init_db, connect
from .schemas import SensorInput, WorkOrderInput

ROOT = Path(os.getenv('PROJECT_DATA_DIR','/app/data'))
MODEL_DIR = Path(os.getenv('MODEL_DIR','/app/models'))
MODEL_PATH = MODEL_DIR / 'champion.pkl'
FEATURES = ['Type','Air temperature [K]','Process temperature [K]','Rotational speed [rpm]','Torque [Nm]','Tool wear [min]']
app = FastAPI(title='MachineMitra API', version='1.0.0', description='Predictive maintenance and MLOps API')
app.add_middleware(CORSMiddleware, allow_origins=os.getenv('CORS_ORIGINS','http://localhost:8080,http://localhost:5173').split(','), allow_credentials=True, allow_methods=['*'], allow_headers=['*'])

@app.on_event('startup')
def startup(): init_db()

@app.get('/api/health')
def health():
    return {'status':'healthy','service':'machinemitra-api','model_loaded':MODEL_PATH.exists(),'mlflow_tracking_uri':os.getenv('MLFLOW_TRACKING_URI','http://mlflow:5000')}

@app.get('/api/model/status')
def model_status():
    if not MODEL_PATH.exists(): return {'trained':False,'message':'No champion model registered yet. Run model training.'}
    try:
        with MODEL_PATH.open('rb') as f: bundle=pickle.load(f)
        return {'trained':True,'model':bundle.get('model_name'),'version':bundle.get('version','1'),'threshold':bundle.get('threshold',0.5),'metrics':bundle.get('metrics',{})}
    except Exception as e: raise HTTPException(500, str(e))

def risk_for(p):
    if p < 0.30: return 'Low'
    if p < 0.70: return 'Medium'
    return 'High'

def action_for(risk, sensors):
    if risk == 'High':
        return 'Urgent inspection: stop or safely isolate the machine if operating conditions are abnormal. Inspect temperature, torque, tool wear and lubrication before restart.'
    if risk == 'Medium':
        checks=[]
        if sensors['toolWear'] >= 150: checks.append('tool wear')
        if sensors['torque'] >= 50: checks.append('torque')
        if sensors['airTemperature'] >= 303: checks.append('air temperature')
        detail=', '.join(checks) if checks else 'sensor trends and operating conditions'
        return f'Schedule a maintenance inspection and review {detail}. Recheck readings during the next operating cycle.'
    return 'Continue normal operation. Maintain routine inspections and monitor sensor trends for changes.'

@app.post('/api/predict')
def predict(payload: SensorInput):
    if not MODEL_PATH.exists(): raise HTTPException(503, 'No trained model is available. Run training from Model Performance first.')
    try:
        with MODEL_PATH.open('rb') as f: bundle=pickle.load(f)
        row=pd.DataFrame([{'Type':payload.productType,'Air temperature [K]':payload.airTemperature,'Process temperature [K]':payload.processTemperature,'Rotational speed [rpm]':payload.rotationalSpeed,'Torque [Nm]':payload.torque,'Tool wear [min]':payload.toolWear}], columns=FEATURES)
        probability=float(bundle['pipeline'].predict_proba(row)[0,1])
        threshold=float(bundle.get('threshold',0.5))
        failure=probability >= threshold
        risk=risk_for(probability)
        sensors={'airTemperature':payload.airTemperature,'processTemperature':payload.processTemperature,'rotationalSpeed':payload.rotationalSpeed,'torque':payload.torque,'toolWear':payload.toolWear}
        now=datetime.now(timezone.utc).isoformat()
        result={'id':str(uuid.uuid4()),'machineId':payload.machineId,'timestamp':now,'probability':round(probability,6),'failure':failure,'risk':risk,'action':action_for(risk,sensors),'sensors':sensors,'model':bundle['model_name'],'version':str(bundle.get('version','1')),'saved':True}
        with connect() as con:
            con.execute('INSERT INTO predictions VALUES (?,?,?,?,?,?,?,?,?,?)',(result['id'],result['machineId'],now,probability,int(failure),risk,result['action'],json.dumps(sensors),result['model'],result['version']))
        return result
    except HTTPException: raise
    except Exception as e: raise HTTPException(500, f'Prediction failed: {e}')

@app.get('/api/predictions')
def predictions(limit:int=500):
    with connect() as con: rows=con.execute('SELECT * FROM predictions ORDER BY timestamp DESC LIMIT ?', (min(limit,2000),)).fetchall()
    return [{'id':r['id'],'machineId':r['machine_id'],'timestamp':r['timestamp'],'probability':r['probability'],'failure':bool(r['failure']),'risk':r['risk'],'action':r['action'],'sensors':json.loads(r['sensors']),'model':r['model'],'version':r['version'],'saved':True} for r in rows]

@app.post('/api/train')
def train(background_tasks:BackgroundTasks):
    status_file=ROOT/'training_status.json'
    status_file.parent.mkdir(parents=True,exist_ok=True)
    status_file.write_text(json.dumps({'status':'queued','startedAt':datetime.now(timezone.utc).isoformat()}))
    background_tasks.add_task(run_training)
    return {'status':'queued','message':'Training job started. Poll /api/train/status.'}

def run_training():
    script=Path('/app/ml_pipeline/train.py')
    status_file=ROOT/'training_status.json'
    try:
        status_file.write_text(json.dumps({'status':'running','startedAt':datetime.now(timezone.utc).isoformat()}))
        result=subprocess.run([sys.executable,str(script)],capture_output=True,text=True,timeout=3600)
        status_file.write_text(json.dumps({'status':'completed' if result.returncode==0 else 'failed','finishedAt':datetime.now(timezone.utc).isoformat(),'output':result.stdout[-5000:],'error':result.stderr[-5000:]}))
    except Exception as e: status_file.write_text(json.dumps({'status':'failed','error':str(e)}))

@app.get('/api/train/status')
def train_status():
    p=ROOT/'training_status.json'
    return json.loads(p.read_text()) if p.exists() else {'status':'not_started'}

@app.get('/api/model/metrics')
def model_metrics():
    if not MODEL_PATH.exists(): return {'trained':False,'models':[]}
    with MODEL_PATH.open('rb') as f: bundle=pickle.load(f)
    return {'trained':True,'champion':bundle['model_name'],'version':bundle.get('version','1'),'models':bundle.get('all_metrics',[]),'threshold':bundle.get('threshold',0.5)}

@app.post('/api/data/upload')
def upload_data(file:UploadFile=File(...)):
    if not file.filename.lower().endswith('.csv'): raise HTTPException(400,'Upload a CSV file.')
    dest=ROOT/'incoming'/f'{uuid.uuid4().hex}_{Path(file.filename).name}'
    dest.parent.mkdir(parents=True,exist_ok=True)
    dest.write_bytes(file.file.read())
    return {'filename':dest.name,'message':'CSV uploaded. Validate labels and schema before using it for retraining.'}

@app.get('/api/monitoring/summary')
def monitoring_summary():
    with connect() as con:
        rows=con.execute('SELECT probability,risk,failure,timestamp FROM predictions ORDER BY timestamp DESC LIMIT 500').fetchall()
    vals=[r['probability'] for r in rows]
    return {'predictionCount':len(rows),'highRiskCount':sum(r['risk']=='High' for r in rows),'failureCount':sum(r['failure'] for r in rows),'averageProbability':round(float(np.mean(vals)),2) if vals else 0,'lastPrediction':rows[0]['timestamp'] if rows else None,'driftStatus':'insufficient_data' if len(rows)<30 else 'baseline_required'}

@app.get('/api/work-orders')
def get_work_orders():
    with connect() as con: rows=con.execute('SELECT * FROM work_orders ORDER BY created_at DESC').fetchall()
    return [dict(r) for r in rows]

@app.post('/api/work-orders')
def create_work_order(item:WorkOrderInput):
    ident='WO-'+uuid.uuid4().hex[:8].upper(); now=datetime.now(timezone.utc).isoformat()
    with connect() as con: con.execute('INSERT INTO work_orders VALUES (?,?,?,?,?,?,?,?)',(ident,item.machineId,item.title,item.priority,item.status,item.technician,item.dueDate,now))
    return {'id':ident,'machineId':item.machineId,'title':item.title,'priority':item.priority,'status':item.status,'technician':item.technician,'dueDate':item.dueDate,'createdAt':now}

@app.patch('/api/work-orders/{work_id}')
def update_work_order(work_id:str,status:str):
    with connect() as con:
        cur=con.execute('UPDATE work_orders SET status=? WHERE id=?',(status,work_id))
        if not cur.rowcount: raise HTTPException(404,'Work order not found')
    return {'updated':True,'id':work_id,'status':status}
