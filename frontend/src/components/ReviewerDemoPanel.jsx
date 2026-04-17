import { useEffect, useMemo, useState } from "react";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api";

function prettyPrint(value) {
  return JSON.stringify(value, null, 2);
}

function ReviewerDemoPanel({ draft, hcps, lastSaved }) {
  const [results, setResults] = useState({});
  const [loadingTool, setLoadingTool] = useState("");
  const [savedInteractionId, setSavedInteractionId] = useState(null);
  const [editValue, setEditValue] = useState("Positive");
  const [interactions, setInteractions] = useState([]);

  useEffect(() => {
    if (lastSaved?.id) {
      setSavedInteractionId(lastSaved.id);
      setResults((current) => ({
        ...current,
        log_interaction: lastSaved
      }));
    }
  }, [lastSaved]);

  const specialty = useMemo(() => {
    const selected = hcps.find(
      (hcp) => hcp.name.toLowerCase() === draft.hcpName.trim().toLowerCase()
    );

    return selected?.specialty || "Oncology";
  }, [draft.hcpName, hcps]);

  const runTool = async (toolName, path, payload, onSuccess, method = "POST") => {
    setLoadingTool(toolName);

    try {
      const response = await fetch(`${API_BASE}${path}`, {
        method,
        headers: { "Content-Type": "application/json" },
        body: payload ? JSON.stringify(payload) : undefined
      });

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }

      const data = await response.json();
      setResults((current) => ({ ...current, [toolName]: data }));

      if (onSuccess) {
        onSuccess(data);
      }
    } catch (error) {
      setResults((current) => ({
        ...current,
        [toolName]: { error: error.message }
      }));
    } finally {
      setLoadingTool("");
    }
  };

  const loadInteractions = async () => {
    setLoadingTool("interaction_history");

    try {
      const response = await fetch(`${API_BASE}/interactions`);

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }

      const data = await response.json();
      setInteractions(data);
      setResults((current) => ({
        ...current,
        interaction_history: data
      }));
    } catch (error) {
      setResults((current) => ({
        ...current,
        interaction_history: { error: error.message }
      }));
    } finally {
      setLoadingTool("");
    }
  };

  const demoNotes =
    draft.topicsDiscussed ||
    "Today I met Dr. Rahul and discussed Product X efficacy. The sentiment was negative and we shared the brochures. There is also an access concern.";

  const toolCards = [
    {
      key: "search_hcp_profile",
      title: "1. search_hcp_profile",
      description: "Looks up specialty, territory, and preferred channel for the current HCP.",
      actionLabel: "Run Search",
      onClick: () =>
        runTool(
          "search_hcp_profile",
          "/tools/search-hcp-profile",
          { hcpName: draft.hcpName || "Dr. Rahul" }
        )
    },
    {
      key: "check_content_compliance",
      title: "2. check_content_compliance",
      description: "Checks discussion notes and shared materials for simple compliance flags.",
      actionLabel: "Run Compliance Check",
      onClick: () =>
        runTool(
          "check_content_compliance",
          "/tools/check-content-compliance",
          {
            topicsDiscussed: draft.topicsDiscussed || demoNotes,
            materialsShared: draft.materialsShared.length
              ? draft.materialsShared
              : ["Clinical brochure"]
          }
        )
    },
    {
      key: "recommend_next_best_action",
      title: "3. recommend_next_best_action",
      description: "Suggests what the field rep should do next based on specialty, sentiment, and open questions.",
      actionLabel: "Run Recommendation",
      onClick: () =>
        runTool(
          "recommend_next_best_action",
          "/tools/recommend-next-best-action",
          {
            specialty,
            sentiment: draft.sentiment || "Negative",
            openQuestions: draft.followUpActions || demoNotes
          }
        )
    },
    {
      key: "summarize_interaction_notes",
      title: "4. summarize_interaction_notes",
      description: "Condenses the free-text interaction notes into a short CRM-style summary.",
      actionLabel: "Run Summary",
      onClick: () =>
        runTool(
          "summarize_interaction_notes",
          "/tools/summarize-interaction-notes",
          { notes: demoNotes }
        )
    },
    {
      key: "log_interaction",
      title: "5. log_interaction",
      description: "Saves the current interaction draft and returns the created record id.",
      actionLabel: "Run Save",
      onClick: () =>
        runTool("log_interaction", "/interactions", draft, (data) => {
          setSavedInteractionId(data.id);
        })
    },
    {
      key: "edit_interaction",
      title: "6. edit_interaction",
      description: "Updates the saved interaction so you can prove audit-friendly edit support.",
      actionLabel: "Run Edit",
      onClick: () =>
        runTool(
          "edit_interaction",
          `/interactions/${savedInteractionId}`,
          {
            interactionId: savedInteractionId,
            fieldName: "sentiment",
            newValue: editValue
          },
          null,
          "PUT"
        ),
      disabled: !savedInteractionId
    }
  ];

  return (
    <section className="panel reviewer-panel">
      <div className="panel-header">
        <div>
          <h2>Reviewer Tool Demo</h2>
          <p>Run each configured tool directly from the web page during your recording.</p>
        </div>
      </div>

      <div className="reviewer-meta">
        <p>
          Current HCP: <strong>{draft.hcpName || "Dr. Rahul"}</strong>
        </p>
        <p>
          Saved Interaction ID: <strong>{savedInteractionId || "Not saved yet"}</strong>
        </p>
      </div>

      <label className="field reviewer-inline-field">
        <span>Edit Sentiment Value</span>
        <select value={editValue} onChange={(event) => setEditValue(event.target.value)}>
          <option>Positive</option>
          <option>Neutral</option>
          <option>Negative</option>
        </select>
      </label>

      <div className="reviewer-meta">
        <button
          type="button"
          className="secondary-button"
          onClick={loadInteractions}
          disabled={loadingTool === "interaction_history"}
        >
          {loadingTool === "interaction_history" ? "Loading..." : "View All Logged Interactions"}
        </button>
        <p>
          Records Loaded: <strong>{interactions.length}</strong>
        </p>
      </div>

      <div className="reviewer-grid">
        {toolCards.map((tool) => (
          <article key={tool.key} className="reviewer-card">
            <h3>{tool.title}</h3>
            <p>{tool.description}</p>
            <button
              type="button"
              className="secondary-button"
              onClick={tool.onClick}
              disabled={loadingTool === tool.key || tool.disabled}
            >
              {loadingTool === tool.key ? "Running..." : tool.actionLabel}
            </button>
            <pre>{prettyPrint(results[tool.key] || { status: "Not run yet" })}</pre>
          </article>
        ))}
      </div>

      <div className="reviewer-grid">
        <article className="reviewer-card reviewer-card-wide">
          <h3>Logged Interaction History</h3>
          <p>Load the in-memory interaction store to verify saved and edited records.</p>
          <pre>{prettyPrint(results.interaction_history || { status: "Not loaded yet" })}</pre>
        </article>
      </div>
    </section>
  );
}

export default ReviewerDemoPanel;
