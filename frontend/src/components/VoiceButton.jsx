import { useCallback, useMemo, useRef, useState } from "react";
import { Loader2, Mic, MicOff } from "lucide-react";

import { api, getApiErrorMessage } from "../lib/api";

export default function VoiceButton({ onProcessed }) {
	const [status, setStatus] = useState("idle"); // idle | listening | review | processing | error
	const [transcript, setTranscript] = useState("");
	const [pending, setPending] = useState("");
	const recognitionRef = useRef(null);
	const transcriptRef = useRef("");
	const [typed, setTyped] = useState("");

	const speechSupported = useMemo(() => {
		if (typeof window === "undefined") return false;
		return Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
	}, []);

	const submitTranscript = useCallback(
		async (text) => {
			const finalTranscript = String(text || "").trim();
			if (!finalTranscript) return;

			setStatus("processing");
			try {
				await api.post("/transactions/voice", { transcript: finalTranscript });
				onProcessed?.();
				setStatus("idle");
			} catch (err) {
				setTranscript(getApiErrorMessage(err));
				setStatus("error");
				setTimeout(() => setStatus("idle"), 2000);
			}
		},
		[onProcessed]
	);

	const stageForReview = useCallback(
		(text) => {
			const finalTranscript = String(text || "").trim();
			if (!finalTranscript) return;
			setPending(finalTranscript);
			setTranscript(finalTranscript);
			setStatus("review");
		},
		[]
	);

	const toggle = useCallback(async () => {
		if (status === "listening") {
			recognitionRef.current?.stop?.();
			setStatus("idle");
			return;
		}

		const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
		if (!SpeechRecognition) return;

		const recognition = new SpeechRecognition();
		recognition.lang = "hi-IN";
		recognition.continuous = false;
		recognition.interimResults = true;
		recognition.maxAlternatives = 1;
		recognitionRef.current = recognition;
		transcriptRef.current = "";
		setTranscript("");

		recognition.onstart = () => setStatus("listening");
		recognition.onresult = (e) => {
			const text = Array.from(e.results)
				.map((r) => r[0]?.transcript)
				.join("")
				.trim();
			transcriptRef.current = text;
			setTranscript(text);
		};

		recognition.onerror = (e) => {
			setTranscript(e?.error ? `Mic error: ${e.error}` : "Mic error");
			setStatus("error");
			setTimeout(() => setStatus("idle"), 2000);
		};

		recognition.onend = async () => {
			const finalTranscript = String(transcriptRef.current || "").trim();
			if (!finalTranscript) {
				setStatus("idle");
				return;
			}
			stageForReview(finalTranscript);
		};

		recognition.start();
	}, [status, submitTranscript]);

	const buttonClass =
		status === "listening"
			? "bg-red-500 text-white animate-pulse"
			: status === "processing"
			? "bg-amber-500 text-white"
			: "bg-sky-500 text-white hover:scale-105";

	return (
		<div className="flex flex-col items-center gap-2">
			<button
				type="button"
				onClick={toggle}
				className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all ${buttonClass}`}
				aria-label="Voice entry"
				disabled={!speechSupported && status === "processing"}
			>
				{status === "listening" ? (
					<MicOff className="w-6 h-6" />
				) : status === "processing" ? (
					<Loader2 className="w-6 h-6 animate-spin" />
				) : (
					<Mic className="w-6 h-6" />
				)}
			</button>

			{(!speechSupported || status === "listening" || transcript) && (
				<div className="text-xs text-center max-w-[220px]">
					{!speechSupported && (
						<div className="text-slate-500">
							<p className="font-medium text-slate-700">Speech not supported in this browser</p>
							<p className="mt-0.5">
								Use Chrome or Microsoft Edge and allow microphone permission.
							</p>
						</div>
					)}
					{status === "listening" && (
						<span className="text-red-600 font-medium">Listening…</span>
					)}
					{status === "review" && (
						<span className="text-sky-700 font-medium">Review & confirm</span>
					)}
					{transcript && (
						<p className="text-slate-500 mt-0.5">“{transcript}”</p>
					)}
				</div>
			)}

			{status === "review" ? (
				<div className="w-full max-w-[260px] flex gap-2">
					<button
						type="button"
						onClick={() => {
							const text = String(pending || "").trim();
							if (!text) {
								setStatus("idle");
								return;
							}
							submitTranscript(text);
						}}
						className="flex-1 text-xs rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white py-2 disabled:opacity-60"
						disabled={status === "processing"}
					>
						Confirm
					</button>
					<button
						type="button"
						onClick={() => {
							setPending("");
							setTranscript("");
							setStatus("idle");
						}}
						className="flex-1 text-xs rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-800 py-2"
					>
						Cancel
					</button>
				</div>
			) : null}

			{!speechSupported && (
				<div className="w-full max-w-[260px] flex flex-col gap-2">
					<textarea
						value={typed}
						onChange={(e) => setTyped(e.target.value)}
						rows={2}
						placeholder="Type/paste: 'total 1600 cash 500 online 800'"
						className="w-full text-xs rounded-lg border border-slate-200 px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-sky-200"
					/>
					<button
						type="button"
						onClick={() => stageForReview(typed)}
						disabled={status === "processing"}
						className="w-full text-xs rounded-lg bg-slate-900 text-white py-1.5 disabled:opacity-60"
					>
						Review
					</button>
				</div>
			)}
		</div>
	);
}
