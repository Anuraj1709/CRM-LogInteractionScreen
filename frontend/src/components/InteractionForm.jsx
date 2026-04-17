import { useDispatch, useSelector } from "react-redux";
import {
  addMaterial,
  addSample,
  selectInteraction,
  updateDraftField
} from "../features/interaction/interactionSlice";

const materialsCatalog = ["Clinical brochure", "MOA leave-behind", "Safety handout"];
const sampleCatalog = ["Starter pack", "Patient titration kit", "Trial voucher"];

function Field({ label, children }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}

function InteractionForm({ hcps, onSubmit, saveStatus }) {
  const dispatch = useDispatch();
  const { draft } = useSelector(selectInteraction);

  const setField = (field) => (event) =>
    dispatch(updateDraftField({ field, value: event.target.value }));

  return (
    <form className="panel form-panel" onSubmit={onSubmit}>
      <div className="panel-header">
        <div>
          <h2>Interaction Details</h2>
        </div>
      </div>

      <div className="form-grid">
        <Field label="HCP Name">
          <input
            type="text"
            placeholder="Enter HCP name..."
            value={draft.hcpName}
            onChange={(event) => {
              const value = event.target.value;
              const selected = hcps.find((hcp) => hcp.name.toLowerCase() === value.trim().toLowerCase());
              dispatch(updateDraftField({ field: "hcpName", value }));
              dispatch(
                updateDraftField({
                  field: "hcpId",
                  value: selected ? selected.id : ""
                })
              );
            }}
          />
        </Field>

        <Field label="Interaction Type">
          <select value={draft.interactionType} onChange={setField("interactionType")}>
            <option>Meeting</option>
            <option>Call</option>
            <option>Webinar</option>
            <option>Advisory Board</option>
            <option>Congress Follow-up</option>
          </select>
        </Field>

        <Field label="Date">
          <input type="date" value={draft.interactionDate} onChange={setField("interactionDate")} />
        </Field>

        <Field label="Time">
          <input type="time" value={draft.interactionTime} onChange={setField("interactionTime")} />
        </Field>

        <Field label="Attendees">
          <input
            type="text"
            placeholder="Enter names or search..."
            value={draft.attendees}
            onChange={setField("attendees")}
          />
        </Field>

        <Field label="Channel">
          <select value={draft.channel} onChange={setField("channel")}>
            <option>In-person</option>
            <option>Virtual</option>
            <option>Phone</option>
            <option>Email follow-up</option>
          </select>
        </Field>

        <Field label="Topics Discussed">
          <textarea
            rows="4"
            placeholder="Enter key discussion points..."
            value={draft.topicsDiscussed}
            onChange={setField("topicsDiscussed")}
          />
        </Field>

        <div className="summary-pill">
          <span>AI-Assist</span>
          <p>Summarize from voice note after consent and compliant recording confirmation.</p>
        </div>

        <div className="list-card">
          <div className="list-card-header">
            <h3>Materials Shared</h3>
            <button
              type="button"
              onClick={() => dispatch(addMaterial(materialsCatalog[draft.materialsShared.length % materialsCatalog.length]))}
            >
              Search/Add
            </button>
          </div>
          <ul>
            {draft.materialsShared.length ? (
              draft.materialsShared.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)
            ) : (
              <li className="placeholder">No materials added.</li>
            )}
          </ul>
        </div>

        <div className="list-card">
          <div className="list-card-header">
            <h3>Samples Distributed</h3>
            <button
              type="button"
              onClick={() => dispatch(addSample(sampleCatalog[draft.samplesDistributed.length % sampleCatalog.length]))}
            >
              Add Sample
            </button>
          </div>
          <ul>
            {draft.samplesDistributed.length ? (
              draft.samplesDistributed.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)
            ) : (
              <li className="placeholder">No samples added.</li>
            )}
          </ul>
        </div>

        <Field label="Observed / Inferred HCP Sentiment">
          <div className="segmented-group">
            {["Positive", "Neutral", "Negative"].map((value) => (
              <label key={value} className={`sentiment-pill ${draft.sentiment === value ? "active" : ""}`}>
                <input
                  type="radio"
                  name="sentiment"
                  value={value}
                  checked={draft.sentiment === value}
                  onChange={setField("sentiment")}
                />
                {value}
              </label>
            ))}
          </div>
        </Field>

        <Field label="Outcomes">
          <textarea
            rows="3"
            placeholder="Key outcomes or agreements..."
            value={draft.outcomes}
            onChange={setField("outcomes")}
          />
        </Field>

        <Field label="Follow-up Actions">
          <textarea
            rows="3"
            placeholder="Enter next steps or tasks..."
            value={draft.followUpActions}
            onChange={setField("followUpActions")}
          />
        </Field>

        <div className="suggested-actions">
          <h3>AI Suggested Follow-ups</h3>
          <ul>
            {(draft.aiSuggestedFollowUps.length
              ? draft.aiSuggestedFollowUps
              : [
                  "Schedule follow-up in 2 weeks",
                  "Send congress reprint PDF",
                  "Invite HCP to local advisory event"
                ]
            ).map((item, index) => (
              <li key={`${item}-${index}`}>+ {item}</li>
            ))}
          </ul>
        </div>
      </div>

      <div className="form-actions">
        <button type="submit" className="primary-button" disabled={saveStatus === "loading"}>
          {saveStatus === "loading" ? "Logging..." : "Log Interaction"}
        </button>
      </div>
    </form>
  );
}

export default InteractionForm;
