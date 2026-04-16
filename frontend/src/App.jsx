import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import InteractionForm from "./components/InteractionForm";
import AssistantPanel from "./components/AssistantPanel";
import {
  clearError,
  fetchHcps,
  runAssistant,
  selectInteraction,
  submitInteraction,
  pushUserMessage
} from "./features/interaction/interactionSlice";

function App() {
  const dispatch = useDispatch();
  const { draft, messages, status, assistantStatus, hcps, error, lastSaved } =
    useSelector(selectInteraction);
  const [chatInput, setChatInput] = useState("");

  useEffect(() => {
    dispatch(fetchHcps());
  }, [dispatch]);

  const onChatSubmit = (event) => {
    event.preventDefault();

    if (!chatInput.trim()) {
      return;
    }

    dispatch(pushUserMessage(chatInput));
    dispatch(
      runAssistant({
        message: chatInput,
        draft
      })
    );
    setChatInput("");
  };

  const onFormSubmit = (event) => {
    event.preventDefault();
    dispatch(clearError());
    dispatch(submitInteraction(draft));
  };

  return (
    <main className="page-shell">
      <section className="hero-card">
        <div>
          <p className="eyebrow">AI-First CRM for Life Sciences</p>
          <h1>Log HCP Interaction</h1>
          <p className="hero-copy">
            Field representatives can capture HCP engagement through a structured
            compliant form or through a conversational assistant powered by
            LangGraph and Groq.
          </p>
        </div>
        <div className="hero-meta">
          <span>React + Redux</span>
          <span>FastAPI + LangGraph</span>
          <span>Groq gemma2-9b-it</span>
          <span>Postgres / MySQL</span>
        </div>
      </section>

      <section className="workspace-grid">
        <InteractionForm hcps={hcps} onSubmit={onFormSubmit} saveStatus={status} />
        <AssistantPanel
          chatInput={chatInput}
          setChatInput={setChatInput}
          messages={messages}
          onSubmit={onChatSubmit}
          assistantStatus={assistantStatus}
        />
      </section>

      {(error || lastSaved) && (
        <section className="status-strip">
          {error ? (
            <p>{error}</p>
          ) : (
            <p>
              Logged interaction #{lastSaved.id} for {lastSaved.hcp_name} with{" "}
              {lastSaved.sentiment.toLowerCase()} sentiment.
            </p>
          )}
        </section>
      )}
    </main>
  );
}

export default App;
