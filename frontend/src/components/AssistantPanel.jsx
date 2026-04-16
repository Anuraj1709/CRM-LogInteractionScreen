function AssistantPanel({
  chatInput,
  setChatInput,
  messages,
  onSubmit,
  assistantStatus
}) {
  return (
    <aside className="panel assistant-panel">
      <div className="panel-header">
        <div>
          <h2>AI Assistant</h2>
          <p>Log interactions via chat or ask for guided field completion.</p>
        </div>
      </div>

      <div className="chat-thread">
        {messages.map((message, index) => (
          <div key={`${message.role}-${index}`} className={`message-bubble ${message.role}`}>
            <span>{message.role === "assistant" ? "AI" : "You"}</span>
            <p>{message.content}</p>
          </div>
        ))}
      </div>

      <form className="chat-composer" onSubmit={onSubmit}>
        <input
          type="text"
          placeholder="Describe interaction..."
          value={chatInput}
          onChange={(event) => setChatInput(event.target.value)}
        />
        <button type="submit" className="primary-button" disabled={assistantStatus === "loading"}>
          {assistantStatus === "loading" ? "Thinking..." : "Log"}
        </button>
      </form>
    </aside>
  );
}

export default AssistantPanel;
