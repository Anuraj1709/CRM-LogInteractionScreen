import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api";

const extractHcpFromMessage = (message) => {
  const match = message.match(/\bdr\.?\s+([a-z]+(?:\s+[a-z]+)?)\b/i);

  if (!match) {
    return null;
  }

  const stopWords = new Set([
    "and",
    "at",
    "for",
    "from",
    "in",
    "met",
    "of",
    "on",
    "regarding",
    "regards",
    "the",
    "to",
    "was",
    "with",
    "discussed",
    "discussing",
    "shared"
  ]);

  const nameParts = match[1]
    .split(/\s+/)
    .filter((part) => part && !stopWords.has(part.toLowerCase()));

  if (!nameParts.length) {
    return null;
  }

  const formattedName = nameParts
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");

  return `Dr. ${formattedName}`;
};

const initialDraft = {
  hcpId: "",
  hcpName: "",
  interactionType: "Meeting",
  interactionDate: "2026-04-17",
  interactionTime: "10:30",
  attendees: "",
  topicsDiscussed: "",
  materialsShared: [],
  samplesDistributed: [],
  sentiment: "Neutral",
  outcomes: "",
  followUpActions: "",
  aiSuggestedFollowUps: [],
  channel: "In-person",
  summary: ""
};

const initialMessages = [
  {
    role: "assistant",
    content:
      "Log interaction details here, for example: Met Dr. Smith to discuss Product X efficacy, neutral sentiment, shared brochure."
  }
];

export const fetchHcps = createAsyncThunk("interaction/fetchHcps", async () => {
  const response = await fetch(`${API_BASE}/hcps`);

  if (!response.ok) {
    throw new Error("Unable to load HCP directory.");
  }

  return response.json();
});

export const submitInteraction = createAsyncThunk(
  "interaction/submitInteraction",
  async (payload) => {
    const response = await fetch(`${API_BASE}/interactions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error("Unable to log interaction.");
    }

    return response.json();
  }
);

export const runAssistant = createAsyncThunk(
  "interaction/runAssistant",
  async (payload) => {
    const response = await fetch(`${API_BASE}/agent/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error("AI assistant could not process the request.");
    }

    return response.json();
  }
);

const interactionSlice = createSlice({
  name: "interaction",
  initialState: {
    draft: initialDraft,
    hcps: [],
    messages: initialMessages,
    status: "idle",
    assistantStatus: "idle",
    directoryStatus: "idle",
    error: null,
    lastSaved: null
  },
  reducers: {
    updateDraftField(state, action) {
      const { field, value } = action.payload;
      state.draft[field] = value;
    },
    addMaterial(state, action) {
      state.draft.materialsShared.push(action.payload);
    },
    addSample(state, action) {
      state.draft.samplesDistributed.push(action.payload);
    },
    pushUserMessage(state, action) {
      const message = action.payload;
      const extractedHcp = extractHcpFromMessage(message);

      state.messages.push({ role: "user", content: message });

      if (extractedHcp && !state.draft.hcpName) {
        state.draft.hcpName = extractedHcp;
        state.draft.hcpId = "";
      }
    },
    clearError(state) {
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchHcps.pending, (state) => {
        state.directoryStatus = "loading";
      })
      .addCase(fetchHcps.fulfilled, (state, action) => {
        state.directoryStatus = "succeeded";
        state.hcps = action.payload;
      })
      .addCase(fetchHcps.rejected, (state, action) => {
        state.directoryStatus = "failed";
        state.error = action.error.message;
      })
      .addCase(submitInteraction.pending, (state) => {
        state.status = "loading";
      })
      .addCase(submitInteraction.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.lastSaved = action.payload;
        state.messages = [
          ...initialMessages,
          {
            role: "assistant",
            content: `Interaction saved for ${action.payload.hcp_name}. Start the next interaction when you're ready.`
          }
        ];
        state.draft = {
          ...initialDraft,
          interactionDate: state.draft.interactionDate,
          interactionTime: state.draft.interactionTime
        };
      })
      .addCase(submitInteraction.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.error.message;
      })
      .addCase(runAssistant.pending, (state) => {
        state.assistantStatus = "loading";
      })
      .addCase(runAssistant.fulfilled, (state, action) => {
        state.assistantStatus = "succeeded";
        const draftUpdates =
          action.payload.draft_updates || action.payload.draftUpdates || null;
        state.messages.push({
          role: "assistant",
          content: action.payload.message
        });

        if (draftUpdates) {
          state.draft = {
            ...state.draft,
            ...draftUpdates
          };
        }
      })
      .addCase(runAssistant.rejected, (state, action) => {
        state.assistantStatus = "failed";
        state.error = action.error.message;
      });
  }
});

export const {
  updateDraftField,
  addMaterial,
  addSample,
  pushUserMessage,
  clearError
} = interactionSlice.actions;

export const selectInteraction = (state) => state.interaction;

export default interactionSlice.reducer;
