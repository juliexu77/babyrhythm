import { useState, useRef, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, MessageCircle, Bot, User, Lightbulb } from "lucide-react";
import { Activity } from "./ActivityCard";
import { answerQuestion, analyzePatterns, PatternInsight } from "@/utils/patternAnalysis";

interface Message {
  id: string;
  text: string;
  sender: "user" | "bot";
  timestamp: Date;
}

interface ChatPanelProps {
  activities: Activity[];
  isOpen: boolean;
  onToggle: () => void;
  showFixedButton?: boolean; // Add prop to control fixed button visibility
}

export const ChatPanel = ({ activities, isOpen, onToggle, showFixedButton = false }: ChatPanelProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [insights, setInsights] = useState<PatternInsight[]>([]);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const newInsights = analyzePatterns(activities);
    setInsights(newInsights);
    
    // Add welcome message on first load
    if (messages.length === 0) {
      setMessages([{
        id: "welcome",
        text: "Hi! I can help you understand your baby's patterns and answer questions about their activities. Try asking 'How much did baby drink today?' or 'When is the next nap?'",
        sender: "bot",
        timestamp: new Date()
      }]);
    }
  }, [activities]);

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = () => {
    if (!inputValue.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputValue,
      sender: "user",
      timestamp: new Date()
    };

    const botResponse = answerQuestion(inputValue, activities);
    const botMessage: Message = {
      id: (Date.now() + 1).toString(),
      text: botResponse,
      sender: "bot",
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage, botMessage]);
    setInputValue("");
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSendMessage();
    }
  };

  const suggestionQuestions = [
    "How much did baby drink today?",
    "When did baby last wake up?", 
    "When is the next feed?",
    "How many diapers today?"
  ];

  if (!isOpen && showFixedButton) {
    return (
      <Button
        onClick={onToggle}
        className="fixed bottom-6 left-6 h-14 w-14 rounded-full bg-gradient-chat shadow-soft hover:shadow-lg transition-all duration-300"
        size="icon"
      >
        <MessageCircle className="h-6 w-6 text-white" />
      </Button>
    );
  }

  if (!isOpen) {
    return null; // Don't render anything if closed and no fixed button needed
  }

  return (
    <Card className="fixed bottom-6 left-6 w-80 h-96 shadow-soft flex flex-col">
      <div className="p-4 border-b bg-gradient-chat text-white rounded-t-lg flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5" />
          <h3 className="font-medium">Baby Insights</h3>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggle}
          className="text-white hover:bg-white/20 h-8 w-8 p-0"
        >
          ×
        </Button>
      </div>

      {/* Insights Section */}
      {insights.length > 0 && (
        <div className="p-3 border-b bg-accent/30">
          <div className="flex items-center gap-2 mb-2">
            <Lightbulb className="h-4 w-4 text-foreground" />
            <span className="text-sm font-medium text-foreground">Latest Insights</span>
          </div>
          <div className="space-y-1">
            {insights.slice(0, 2).map((insight, index) => (
              <div key={`insight-${insight.type}-${index}`} className="text-xs text-muted-foreground bg-background/50 rounded p-2">
                {insight.message}
              </div>
            ))}
          </div>
        </div>
      )}

      <ScrollArea className="flex-1 p-3" ref={scrollAreaRef}>
        <div className="space-y-3">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex items-start gap-2 ${
                message.sender === "user" ? "justify-end" : "justify-start"
              }`}
            >
              {message.sender === "bot" && (
                <div className="h-6 w-6 rounded-full bg-gradient-chat flex items-center justify-center">
                  <Bot className="h-3 w-3 text-white" />
                </div>
              )}
              <div
                className={`max-w-[200px] rounded-lg p-2 text-sm ${
                  message.sender === "user"
                    ? "bg-gradient-primary text-white"
                    : "bg-muted text-foreground"
                }`}
              >
                {message.text}
              </div>
              {message.sender === "user" && (
                <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center">
                  <User className="h-3 w-3 text-foreground" />
                </div>
              )}
            </div>
          ))}

          {/* Quick Suggestions */}
          {messages.length <= 1 && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">Try asking:</p>
              {suggestionQuestions.map((question, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  className="text-xs h-auto p-2 w-full justify-start"
                  onClick={() => setInputValue(question)}
                >
                  {question}
                </Button>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="p-3 border-t">
        <div className="flex gap-2">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask about baby's patterns..."
            className="text-sm"
          />
          <Button
            onClick={handleSendMessage}
            size="sm"
            className="bg-gradient-chat px-3"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
};