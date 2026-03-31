import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { MessageCircle, Send, Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { streamChat, type ChatMessage, type MatchResult } from "@/lib/ai-match";
import type { CompanyProfile } from "@/lib/company-profile";
import type { Exhibitor } from "@/lib/api";

interface Props {
  profile: CompanyProfile;
  exhibitors: Exhibitor[];
  matchResults?: MatchResult[];
}

const MatchChat = ({ profile, exhibitors, matchResults }: Props) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    if (!input.trim() || streaming) return;
    const userMsg: ChatMessage = { role: "user", content: input.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setStreaming(true);

    let assistantContent = "";
    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    try {
      for await (const chunk of streamChat(newMessages, profile, exhibitors, matchResults)) {
        assistantContent += chunk;
        setMessages((prev) => {
          const copy = [...prev];
          copy[copy.length - 1] = { role: "assistant", content: assistantContent };
          return copy;
        });
      }
    } catch (err: any) {
      assistantContent = `⚠️ Error: ${err.message}`;
      setMessages((prev) => {
        const copy = [...prev];
        copy[copy.length - 1] = { role: "assistant", content: assistantContent };
        return copy;
      });
    } finally {
      setStreaming(false);
    }
  };

  const suggestions = [
    "Which exhibitors focus on sustainable products?",
    "Tell me more about the top match",
    "Which ones could be OEM partners?",
    "Refine for LED products only",
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
      <Card className="flex flex-col" style={{ minHeight: 400 }}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-display">
            <MessageCircle className="h-4 w-4 text-primary" />
            AI Analysis Chat
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-1 flex-col gap-3">
          <ScrollArea className="flex-1 pr-2" style={{ maxHeight: 320 }}>
            {messages.length === 0 && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Ask follow-up questions about your matches:</p>
                <div className="flex flex-wrap gap-1.5">
                  {suggestions.map((s) => (
                    <button
                      key={s}
                      onClick={() => { setInput(s); }}
                      className="rounded-full border border-border bg-background px-2.5 py-1 text-[11px] text-muted-foreground hover:bg-secondary transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="space-y-3">
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>
                    {msg.role === "assistant" ? (
                      <div className="prose prose-sm dark:prose-invert max-w-none [&>p]:m-0">
                        <ReactMarkdown>{msg.content || "..."}</ReactMarkdown>
                      </div>
                    ) : (
                      msg.content
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div ref={bottomRef} />
          </ScrollArea>
          <form
            className="flex gap-2"
            onSubmit={(e) => { e.preventDefault(); send(); }}
          >
            <Input
              placeholder="Ask about your matches..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={streaming}
              className="flex-1"
            />
            <Button type="submit" size="icon" disabled={streaming || !input.trim()}>
              {streaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default MatchChat;
