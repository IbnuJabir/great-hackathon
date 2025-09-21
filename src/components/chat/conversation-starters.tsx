"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  FileText,
  Search,
  Wrench,
  Shield,
  Settings,
  BookOpen,
  HelpCircle,
  Zap
} from "lucide-react";

interface ConversationStartersProps {
  onStarterClick: (prompt: string) => void;
}

const starters = [
  {
    icon: FileText,
    title: "Document Overview",
    prompt: "What are the key specifications and important details in my documents?",
    description: "Get a comprehensive overview of your uploaded materials"
  },
  {
    icon: Wrench,
    title: "Troubleshooting",
    prompt: "Help me troubleshoot an issue using the procedures described in the manuals",
    description: "Find diagnostic steps and problem-solving procedures"
  },
  {
    icon: Settings,
    title: "Maintenance Procedures",
    prompt: "What are the maintenance procedures and schedules outlined in my documents?",
    description: "Locate maintenance instructions and scheduling information"
  },
  {
    icon: Shield,
    title: "Safety Guidelines",
    prompt: "Show me the safety guidelines, warnings, and precautions from my documents",
    description: "Review important safety information and warnings"
  },
  {
    icon: BookOpen,
    title: "Operating Procedures",
    prompt: "What are the standard operating procedures and workflows described in my files?",
    description: "Find step-by-step operational instructions"
  },
  {
    icon: Search,
    title: "Parts & Components",
    prompt: "Help me locate part numbers, component details, and technical specifications",
    description: "Search for specific parts and technical details"
  },
  {
    icon: HelpCircle,
    title: "Technical Concepts",
    prompt: "Explain the technical concepts and terminology found in my documents",
    description: "Get clear explanations of technical terms and concepts"
  },
  {
    icon: Zap,
    title: "Quick Reference",
    prompt: "Give me a quick reference guide of the most important information in my documents",
    description: "Get the essential information at a glance"
  }
];

export function ConversationStarters({ onStarterClick }: ConversationStartersProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full p-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">How can I help you today?</h1>
        <p className="text-muted-foreground text-lg">
          Ask me anything about your uploaded documents or try one of these suggestions
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 max-w-6xl w-full">
        {starters.map((starter, index) => {
          const IconComponent = starter.icon;
          return (
            <Card
              key={index}
              className="cursor-pointer hover:shadow-md transition-all duration-200 hover:scale-105"
              onClick={() => onStarterClick(starter.prompt)}
            >
              <CardContent className="p-6">
                <div className="flex flex-col items-center text-center space-y-3">
                  <div className="p-3 rounded-full bg-primary/10">
                    <IconComponent className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-semibold text-sm">{starter.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {starter.description}
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="mt-8 text-center">
        <p className="text-sm text-muted-foreground">
          You can also ask any specific question about your documents using natural language
        </p>
      </div>
    </div>
  );
}