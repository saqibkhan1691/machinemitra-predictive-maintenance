import { ArrowDownUp, Download, Eye, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { Badge, Empty, PageHeader, Pagination } from "../components/UI";
import { useAppData } from "../context/AppData";
import { downloadFile } from "../services/mockApi";

export function PredictionHistory() {
  const data = useAppData();
  const nav = useNavigate();
  const [params] = useSearchParams();
  const [query, setQuery] = useState(params.get("machine") || "");
  const [risk, setRisk] = useState("");
  const [result, setResult] = useState("");
  const [sortDesc, setSortDesc] = useState(true);
  const [page, setPage] = useState(1);
  const rows = useMemo(
    () =>
      data.predictions
        .filter(
          (x) =>
            (x.machineId.toLowerCase().includes(query.toLowerCase()) ||
              x.id.toLowerCase().includes(query.toLowerCase())) &&
            (!risk || x.risk === risk) &&
            (!result || (result === "yes") === x.failure),
        )
        .sort((a, b) => a.timestamp.localeCompare(b.timestamp) * (sortDesc ? -1 : 1)),
    [data.predictions, query, risk, result, sortDesc],
  );
  const size = 7,
    pages = Math.ceil(rows.length / size),
    shown = rows.slice((page - 1) * size, page * size);
  const exportCsv = () =>
    downloadFile(
      "machinemitra-prediction-history.csv",
      [
        "Prediction ID,Machine ID,Timestamp,Failure,Probability,Risk,Model",
        ...rows.map(
          (x) =>
            `${x.id},${x.machineId},${x.timestamp},${x.failure ? "YES" : "NO"},${x.probability},${x.risk},${x.model}`,
        ),
      ].join("\n"),
    );
  return (
    <div className="page">
      <PageHeader
        title="Prediction History"
        description={`${data.predictions.length} mock prediction records, including newly generated results.`}
        actions={
          <button className="btn secondary" onClick={exportCsv}>
            <Download size={16} />
            Export CSV
          </button>
        }
      />
      <div className="filterbar">
        <div className="field-search">
          <Search size={16} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search machine or prediction ID"
          />
        </div>
        <select value={result} onChange={(e) => setResult(e.target.value)}>
          <option value="">All results</option>
          <option value="yes">Failure: YES</option>
          <option value="no">Failure: NO</option>
        </select>
        <select value={risk} onChange={(e) => setRisk(e.target.value)}>
          <option value="">All risks</option>
          <option>Low</option>
          <option>Medium</option>
          <option>High</option>
        </select>
      </div>
      <div className="table-card">
        <table>
          <thead>
            <tr>
              <th>Prediction</th>
              <th>Machine</th>
              <th>
                <button onClick={() => setSortDesc(!sortDesc)}>
                  Timestamp <ArrowDownUp size={13} />
                </button>
              </th>
              <th>Result</th>
              <th>Probability</th>
              <th>Risk</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((x) => (
              <tr key={x.id}>
                <td>
                  <strong>{x.id}</strong>
                  <small>{x.model}</small>
                </td>
                <td>{x.machineId}</td>
                <td>{new Date(x.timestamp).toLocaleString()}</td>
                <td>
                  <Badge tone={x.failure ? "Critical" : "Healthy"}>
                    {x.failure ? "YES" : "NO"}
                  </Badge>
                </td>
                <td>
                  <strong>{Math.round(x.probability * 100)}%</strong>
                </td>
                <td>
                  <Badge tone={x.risk}>{x.risk}</Badge>
                </td>
                <td>
                  <button
                    className="icon-action"
                    onClick={() => nav(`/predictions/${x.id}`)}
                    title="View report"
                  >
                    <Eye size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!shown.length && (
          <Empty title="No predictions found" text="Adjust the filters or run a new prediction." />
        )}
        <Pagination page={page} pages={pages} onChange={setPage} />
      </div>
    </div>
  );
}
