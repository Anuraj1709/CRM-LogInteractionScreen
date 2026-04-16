import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api";

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
    messages: [
      {
        role: "assistant",
        content:
          "Log interaction details here, for example: Met Dr. Smith to discuss Product X efficacy, neutral sentiment, shared brochure."
      }
    ],
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
      state.messages.push({ role: "user", content: action.payload });
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
        state.messages.push({
          role: "assistant",
          content: `Interaction saved for ${action.payload.hcp_name}.`
        });
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
