import os, json, pickle, time
from pathlib import Path
import numpy as np, pandas as pd, mlflow, mlflow.sklearn
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.pipeline import Pipeline
from sklearn.impute import SimpleImputer
from sklearn.model_selection import train_test_split, RandomizedSearchCV
from sklearn.metrics import (average_precision_score, recall_score, precision_score, f1_score, roc_auc_score, accuracy_score, confusion_matrix, precision_recall_curve)
from sklearn.ensemble import RandomForestClassifier
from xgboost import XGBClassifier

ROOT=Path('/app')
DATA=Path(os.getenv('DATASET_PATH','/app/data/raw/ai4i2020.csv'))
MODEL_DIR=Path(os.getenv('MODEL_DIR','/app/models')); MODEL_DIR.mkdir(parents=True,exist_ok=True)
TRACKING=os.getenv('MLFLOW_TRACKING_URI','http://mlflow:5000')
FEATURES=['Type','Air temperature [K]','Process temperature [K]','Rotational speed [rpm]','Torque [Nm]','Tool wear [min]']
NUM=FEATURES[1:]

def build_pipeline(model):
    prep=ColumnTransformer([('type',OneHotEncoder(handle_unknown='ignore'),['Type']),('numeric',Pipeline([('imputer',SimpleImputer(strategy='median')),('scale',StandardScaler())]),NUM)])
    return Pipeline([('preprocess',prep),('classifier',model)])

def best_threshold(y,p):
    precision,recall,thresholds=precision_recall_curve(y,p)
    if len(thresholds)==0: return 0.5
    f2=(5*precision[:-1]*recall[:-1])/(4*precision[:-1]+recall[:-1]+1e-12)
    return float(thresholds[int(np.nanargmax(f2))])

def evaluate(y,p,threshold):
    pred=(p>=threshold).astype(int)
    return {'accuracy':float(accuracy_score(y,pred)),'precision':float(precision_score(y,pred,zero_division=0)),'recall':float(recall_score(y,pred,zero_division=0)),'f1':float(f1_score(y,pred,zero_division=0)),'pr_auc':float(average_precision_score(y,p)),'roc_auc':float(roc_auc_score(y,p)),'threshold':float(threshold),'confusion_matrix':confusion_matrix(y,pred).tolist()}

def main():
    df=pd.read_csv(DATA,encoding='utf-8-sig')
    required=FEATURES+['Machine failure']
    missing=set(required)-set(df.columns)
    if missing: raise ValueError(f'Missing dataset columns: {sorted(missing)}')
    df=df[required].dropna().copy(); X=df[FEATURES]; y=df['Machine failure'].astype(int)
    x_train,x_hold,y_train,y_hold=train_test_split(X,y,test_size=.30,random_state=42,stratify=y)
    x_val,x_test,y_val,y_test=train_test_split(x_hold,y_hold,test_size=.50,random_state=42,stratify=y_hold)
    neg=int((y_train==0).sum()); pos=int((y_train==1).sum()); weight=neg/max(pos,1)
    candidates={
      'Random Forest':RandomForestClassifier(n_estimators=350,max_depth=None,min_samples_leaf=2,class_weight='balanced_subsample',n_jobs=-1,random_state=42),
      'XGBoost':XGBClassifier(n_estimators=350,max_depth=5,learning_rate=.05,subsample=.85,colsample_bytree=.85,reg_lambda=2,scale_pos_weight=weight,eval_metric='aucpr',n_jobs=-1,random_state=42)
    }
    mlflow.set_tracking_uri(TRACKING); mlflow.set_experiment('MachineMitra Predictive Maintenance')
    results=[]; fitted={}
    for name,model in candidates.items():
      with mlflow.start_run(run_name=name) as run:
        pipe=build_pipeline(model); start=time.time(); pipe.fit(x_train,y_train); duration=time.time()-start
        val_prob=pipe.predict_proba(x_val)[:,1]; threshold=best_threshold(y_val,val_prob); metrics=evaluate(y_val,val_prob,threshold)
        mlflow.log_params({'model':name,'random_state':42,'train_rows':len(x_train),'validation_rows':len(x_val),'test_rows':len(x_test),'selection':'validation PR-AUC; Recall secondary','threshold_method':'validation F2'})
        mlflow.log_metrics({k:v for k,v in metrics.items() if isinstance(v,(float,int))}); mlflow.log_metric('training_seconds',duration)
        mlflow.sklearn.log_model(pipe,'model')
        results.append({'model':name,'metrics':metrics,'training_seconds':round(duration,3),'run_id':run.info.run_id}); fitted[name]=(pipe,threshold,metrics)
    champion=max(results,key=lambda r:(r['metrics']['pr_auc'],r['metrics']['recall']))
    name=champion['model']; pipe,threshold,val_metrics=fitted[name]
    test_prob=pipe.predict_proba(x_test)[:,1]; test_metrics=evaluate(y_test,test_prob,threshold)
    bundle={'pipeline':pipe,'model_name':name,'version':'1','threshold':threshold,'metrics':test_metrics,'validation_metrics':val_metrics,'all_metrics':results,'trained_at':time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime())}
    with (MODEL_DIR/'champion.pkl').open('wb') as f: pickle.dump(bundle,f)
    (MODEL_DIR/'metrics.json').write_text(json.dumps({'champion':name,'validation_metrics':val_metrics,'test_metrics':test_metrics,'models':results},indent=2))
    with mlflow.start_run(run_name='Champion Evaluation'):
      mlflow.log_params({'champion':name,'threshold':threshold,'selection':'PR-AUC then Recall'}); mlflow.log_metrics({'test_'+k:v for k,v in test_metrics.items() if isinstance(v,(float,int))})
    print(json.dumps({'champion':name,'validation':val_metrics,'test':test_metrics},indent=2))

if __name__=='__main__': main()
