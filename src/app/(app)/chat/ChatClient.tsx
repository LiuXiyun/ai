"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";

type Phase = "idle" | "queued" | "streaming" | "done" | "error" | "stopped";

export function ChatClient() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [phaseText, setPhaseText] = useState<string>("等待提交");
  const [models, setModels] = useState<string[]>([]);
  const [model, setModel] = useState<string>("gpt-4.1-mini");
  const [modelsError, setModelsError] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  async function loadModels() {
    setModelsError("");
    try {
      const res = await fetch("/api/chat/models", { cache: "no-store" });
      const json = (await res.json().catch(() => ({}))) as
        | { items?: string[]; error?: string }
        | undefined;
      if (!res.ok) {
        setModelsError(json?.error || "获取模型列表失败");
        return;
      }
      const items = Array.isArray(json?.items) ? json?.items : [];
      setModels(items);
      if (items.includes("gpt-4.1-mini")) {
        setModel("gpt-4.1-mini");
      } else if (items[0]) {
        setModel(items[0]);
      }
    } catch {
      setModelsError("获取模型列表失败（网络错误）");
    }
  }

  useEffect(() => {
    loadModels();
  }, []);

  async function onSubmit() {
    const text = input.trim();
    if (!text) return;

    setLoading(true);
    setError("");
    setOutput("");
    setPhase("queued");
    setPhaseText("已提交，准备连接模型…");
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    try {
      const res = await fetch("/api/chat/stream", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ input: text, model }),
        signal: ac.signal,
      });

      if (!res.ok) {
        const json = (await res.json().catch(() => ({}))) as
          | { error?: string }
          | undefined;
        setError(json?.error || "请求失败");
        setPhase("error");
        setPhaseText("请求失败");
        return;
      }

      if (!res.body) {
        setError("浏览器不支持流式返回（缺少 body）");
        setPhase("error");
        setPhaseText("不支持流式返回");
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const parts = buffer.split("\n\n");
        buffer = parts.pop() ?? "";

        for (const part of parts) {
          const eventLine =
            part.split("\n").find((l) => l.startsWith("event: ")) ?? "";
          const dataLine =
            part.split("\n").find((l) => l.startsWith("data: ")) ?? "";
          const event = eventLine.replace("event: ", "").trim();
          const dataText = dataLine.replace("data: ", "").trim();
          if (!event || !dataText) continue;

          try {
            const data = JSON.parse(dataText) as any;
            if (event === "status") {
              const p = (data?.phase as Phase | undefined) ?? "queued";
              setPhase(p);
              setPhaseText(String(data?.message ?? "处理中…"));
            } else if (event === "token") {
              setPhase("streaming");
              setPhaseText("正在生成中…");
              const delta = data?.text;
              if (typeof delta === "string" && delta) {
                setOutput((prev) => prev + delta);
              }
            } else if (event === "done") {
              setPhase("done");
              setPhaseText("已完成");
            } else if (event === "error") {
              setPhase("error");
              setPhaseText("发生错误");
              setError(String(data?.message ?? "请求失败"));
            }
          } catch {
            // ignore
          }
        }
      }
    } catch {
      if (ac.signal.aborted) {
        setPhase("stopped");
        setPhaseText("已停止");
        return;
      }
      setError("网络错误，请稍后再试");
      setPhase("error");
      setPhaseText("网络错误");
    } finally {
      setLoading(false);
    }
  }

  function onStop() {
    abortRef.current?.abort();
    abortRef.current = null;
    setLoading(false);
    setPhase("stopped");
    setPhaseText("已停止");
  }

  async function onCopyAll() {
    if (!output) return;
    try {
      await navigator.clipboard.writeText(output);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="text-sm font-semibold text-zinc-900">输入你的问题</div>
        <div className="mt-2 flex flex-col gap-3 md:flex-row md:items-end">
          <div className="flex-1">
            <div className="flex flex-col gap-2 md:flex-row md:items-center">
              <div className="text-xs font-semibold text-zinc-700">模型</div>
              <select
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400 md:w-[420px]"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                disabled={loading || models.length === 0}
              >
                {models.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
                {models.length === 0 ? (
                  <option value="gpt-4.1-mini">gpt-4.1-mini</option>
                ) : null}
              </select>
            </div>
            <textarea
              className="min-h-[96px] w-full resize-y rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="例如：帮我把这段话改得更通顺：……"
            />
            <div className="mt-2 text-xs text-zinc-500">
              提示：服务端会用你在 `.env` 里配置的 `OPENAI_API_KEY` 调用
              你选择的模型。
            </div>
            {modelsError ? (
              <div className="mt-2 flex items-center justify-between gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                <div>{modelsError}</div>
                <button
                  className="rounded-md border border-amber-200 bg-white px-2 py-1 text-xs text-amber-800 hover:bg-amber-100"
                  onClick={loadModels}
                  type="button"
                >
                  重试
                </button>
              </div>
            ) : null}
          </div>
          <div className="flex gap-2">
            <Button onClick={onSubmit} disabled={loading || !input.trim()}>
              {loading ? "提交中..." : "提交"}
            </Button>
            <Button
              variant="secondary"
              onClick={onStop}
              disabled={!loading}
              title="停止本次生成"
            >
              停止
            </Button>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-4">
          <div>
            <div className="text-sm font-semibold text-zinc-900">返回结果</div>
            <div className="mt-1 text-sm text-zinc-500">
              状态：{phaseText}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {copied ? (
              <span className="text-xs text-emerald-600">已复制</span>
            ) : null}
            <Button
              variant="secondary"
              onClick={onCopyAll}
              disabled={!output}
            >
              复制全部
            </Button>
          </div>
        </div>

        <div className="max-h-[320px] overflow-y-auto p-5">
          {error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          ) : (
            <div className="whitespace-pre-wrap text-sm leading-6 text-zinc-800">
              {output || "（这里会显示模型的回答）"}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

