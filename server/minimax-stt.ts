const MINIMAX_API_KEY = process.env.MINIMAX_API_KEY || "";
const MINIMAX_GROUP_ID = process.env.MINIMAX_GROUP_ID || "";

interface TranscriptionResult {
  text: string;
  parsedSymptoms: string[];
  parsedMood: string;
  parsedNotes: string;
}

const KNOWN_SYMPTOMS = [
  "Cramps", "Headache", "Bloating", "Acne", "Cravings", "Back Pain",
  "Fatigue", "Nausea", "Breast Tenderness", "Mood Swings", "Insomnia",
  "Hot Flashes", "Dizziness", "Joint Pain", "Hair Loss", "Weight Gain",
];

const KNOWN_MOODS = ["Happy", "Anxious", "Irritable", "Energetic", "Tired", "Calm"];

function parseTranscription(text: string): { symptoms: string[]; mood: string; notes: string } {
  const lower = text.toLowerCase();

  const symptoms = KNOWN_SYMPTOMS.filter(s => lower.includes(s.toLowerCase()));

  let mood = "";
  for (const m of KNOWN_MOODS) {
    if (lower.includes(m.toLowerCase())) {
      mood = m;
      break;
    }
  }

  return { symptoms, mood, notes: text };
}

export async function transcribeAudio(audioBuffer: Buffer, mimeType: string): Promise<TranscriptionResult> {
  const base64Audio = audioBuffer.toString("base64");

  const formatMap: Record<string, string> = {
    "audio/webm": "webm",
    "audio/webm;codecs=opus": "webm",
    "audio/wav": "wav",
    "audio/mp3": "mp3",
    "audio/mpeg": "mp3",
    "audio/ogg": "ogg",
    "audio/ogg;codecs=opus": "ogg",
  };
  const format = formatMap[mimeType] || "webm";

  try {
    const response = await fetch("https://api.minimax.chat/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${MINIMAX_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "speech-01-turbo",
        file: `data:${mimeType};base64,${base64Audio}`,
        language: "en",
      }),
    });

    if (response.ok) {
      const data = await response.json() as any;
      const transcribedText = data.text || data.transcript || "";
      if (transcribedText) {
        const parsed = parseTranscription(transcribedText);
        return {
          text: transcribedText,
          parsedSymptoms: parsed.symptoms,
          parsedMood: parsed.mood,
          parsedNotes: parsed.notes,
        };
      }
    }
  } catch (err) {
    console.error("Minimax STT primary endpoint failed:", err);
  }

  try {
    const formData = new FormData();
    const blob = new Blob([audioBuffer], { type: mimeType });
    formData.append("file", blob, `recording.${format}`);
    formData.append("model", "speech-01-turbo");
    formData.append("language", "en");

    const groupParam = MINIMAX_GROUP_ID ? `?GroupId=${MINIMAX_GROUP_ID}` : "";
    const response = await fetch(`https://api.minimax.chat/v1/audio/transcriptions${groupParam}`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${MINIMAX_API_KEY}`,
      },
      body: formData,
    });

    if (response.ok) {
      const data = await response.json() as any;
      const transcribedText = data.text || data.transcript || "";
      if (transcribedText) {
        const parsed = parseTranscription(transcribedText);
        return {
          text: transcribedText,
          parsedSymptoms: parsed.symptoms,
          parsedMood: parsed.mood,
          parsedNotes: parsed.notes,
        };
      }
    }
  } catch (err) {
    console.error("Minimax STT multipart endpoint failed:", err);
  }

  try {
    const OpenAI = (await import("openai")).default;
    const minimaxClient = new OpenAI({
      apiKey: MINIMAX_API_KEY,
      baseURL: "https://api.minimax.chat/v1",
    });

    const audioFile = new File([audioBuffer], `recording.${format}`, { type: mimeType });
    const transcription = await minimaxClient.audio.transcriptions.create({
      model: "speech-01-turbo",
      file: audioFile,
      language: "en",
    } as any);

    const transcribedText = (transcription as any).text || "";
    if (transcribedText) {
      const parsed = parseTranscription(transcribedText);
      return {
        text: transcribedText,
        parsedSymptoms: parsed.symptoms,
        parsedMood: parsed.mood,
        parsedNotes: parsed.notes,
      };
    }
  } catch (err) {
    console.error("Minimax OpenAI-compatible STT failed:", err);
  }

  return {
    text: "",
    parsedSymptoms: [],
    parsedMood: "",
    parsedNotes: "",
  };
}
