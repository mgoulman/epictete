"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Search, ChevronRight, ArrowLeft, Send } from "lucide-react";
import { PermissionGate } from "@/components/backoffice/auth/PermissionGate";

type Language = "en" | "fr";

const DOCS = [
  { id: "ai-context", name: "AI Context (Master)", category: "Overview", icon: "🎯", path: "AI_CONTEXT.md" },
  { id: "brand-identity", name: "Brand Identity", category: "Brand", icon: "✨", path: "01-brand/BRAND_IDENTITY.md" },
  { id: "brand-voice", name: "Brand Voice", category: "Brand", icon: "💬", path: "01-brand/BRAND_VOICE.md" },
  { id: "visual-guidelines", name: "Visual Guidelines", category: "Brand", icon: "🎨", path: "01-brand/VISUAL_GUIDELINES.md" },
  { id: "restaurant-profile", name: "Restaurant Profile", category: "Restaurant", icon: "🏠", path: "02-restaurant/RESTAURANT_PROFILE.md" },
  { id: "menu-catalog", name: "Menu Catalog", category: "Restaurant", icon: "📋", path: "02-restaurant/MENU_CATALOG.md" },
  { id: "story-origin", name: "Story & Origin", category: "Restaurant", icon: "📖", path: "02-restaurant/STORY_ORIGIN.md" },
  { id: "customer-personas", name: "Customer Personas", category: "Audience", icon: "👥", path: "03-audience/CUSTOMER_PERSONAS.md" },
  { id: "marketing-strategy", name: "Marketing Strategy", category: "Marketing", icon: "📈", path: "04-marketing/MARKETING_STRATEGY.md" },
  { id: "content-pillars", name: "Content Pillars", category: "Marketing", icon: "🏛️", path: "04-marketing/CONTENT_PILLARS.md" },
  { id: "social-media-guide", name: "Social Media Guide", category: "Marketing", icon: "📱", path: "04-marketing/SOCIAL_MEDIA_GUIDE.md" },
  { id: "contact-social", name: "Contact & Social", category: "Operations", icon: "📞", path: "05-operations/CONTACT_SOCIAL.md" },
];

const CATEGORIES = ["All", "Overview", "Brand", "Restaurant", "Audience", "Marketing", "Operations"];

export default function DocsPage() {
  const [selectedDoc, setSelectedDoc] = useState<typeof DOCS[0] | null>(null);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [lang, setLang] = useState<Language>("en");

  useEffect(() => {
    const saved = localStorage.getItem("admin_lang") as Language;
    if (saved) setLang(saved);
  }, []);

  const filteredDocs = useMemo(() => {
    return DOCS.filter(doc => {
      const matchesSearch = doc.name.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = category === "All" || doc.category === category;
      return matchesSearch && matchesCategory;
    });
  }, [search, category]);

  const loadDoc = useCallback(async (doc: typeof DOCS[0]) => {
    setLoading(true);
    setSelectedDoc(doc);
    try {
      let path = doc.path;
      if (lang === "fr") path = doc.path.replace(".md", "_FR.md");

      let res = await fetch(`/api/marketing-files?path=${encodeURIComponent(path)}`);
      if (!res.ok && lang === "fr") {
        res = await fetch(`/api/marketing-files?path=${encodeURIComponent(doc.path)}`);
      }

      if (res.ok) {
        const data = await res.json();
        setContent(data.content);
      } else {
        setContent("Failed to load document.");
      }
    } catch {
      setContent("Error loading document.");
    }
    setLoading(false);
  }, [lang]);

  const goBack = () => {
    setSelectedDoc(null);
    setContent("");
  };

  // Document list view
  if (!selectedDoc) {
    return (
      <PermissionGate permission="marketing.read" fallback={<div className="text-center py-12 text-muted-foreground">No permission</div>}>
        <div className="flex flex-col gap-6">
          {/* Header */}
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-2xl font-semibold text-foreground">Documentation</h1>
              <p className="text-sm text-muted-foreground mt-1">Brand guidelines, strategy docs, and reference materials</p>
            </div>
            <button
              onClick={() => { const n = lang === "en" ? "fr" : "en"; setLang(n); localStorage.setItem("admin_lang", n); }}
              className="px-3 py-2 text-[13px] bg-secondary border border-border rounded-lg text-foreground cursor-pointer hover:bg-card transition-colors"
            >
              {lang === "en" ? "EN" : "FR"}
            </button>
          </div>

          {/* Search & Filter */}
          <div className="flex flex-col gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search documents..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full py-2.5 pl-10 pr-3 bg-secondary border border-border rounded-lg text-sm text-foreground outline-none focus:border-[#606338]/40"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className={`px-3.5 py-1.5 text-[13px] rounded-lg border-none cursor-pointer transition-all ${
                    category === cat
                      ? 'bg-[#606338] text-white'
                      : 'bg-secondary text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Document Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {filteredDocs.map(doc => (
              <button
                key={doc.id}
                onClick={() => loadDoc(doc)}
                className="flex items-center gap-3 p-4 bg-secondary border border-border rounded-xl cursor-pointer text-left transition-all hover:border-[#606338]/30 hover:bg-card group"
              >
                <span className="text-2xl">{doc.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground truncate">{doc.name}</p>
                  <p className="text-xs text-muted mt-0.5">{doc.category}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted group-hover:text-muted-foreground" />
              </button>
            ))}
          </div>

          {filteredDocs.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              No documents found
            </div>
          )}
        </div>
      </PermissionGate>
    );
  }

  // Document detail view
  return (
    <PermissionGate permission="marketing.read" fallback={<div className="text-center py-12 text-muted-foreground">No permission</div>}>
      <div className="flex flex-col gap-4">
        {/* Back button & title */}
        <div className="flex items-center gap-4">
          <button
            onClick={goBack}
            className="p-2 rounded-lg bg-transparent border-none cursor-pointer text-foreground hover:bg-secondary transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <span className="text-2xl">{selectedDoc.icon}</span>
            <div>
              <h1 className="text-xl font-semibold text-foreground">{selectedDoc.name}</h1>
              <p className="text-[13px] text-muted-foreground">{selectedDoc.category}</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="bg-secondary border border-border rounded-xl p-6 min-h-[60vh]">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-6 h-6 border-2 border-[#606338] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <MarkdownRenderer content={content} />
          )}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={goBack}
            className="flex items-center gap-2 px-4 py-2 bg-transparent border-none text-muted-foreground text-sm cursor-pointer hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to list
          </button>
          <button
            onClick={() => window.open(`mailto:youssef@epictete.ma?subject=[Docs] Feedback: ${selectedDoc.name}`, "_blank")}
            className="flex items-center gap-2 px-4 py-2 bg-transparent border-none text-muted-foreground text-sm cursor-pointer hover:text-foreground transition-colors"
          >
            <Send className="w-4 h-4" /> Send Feedback
          </button>
        </div>
      </div>
    </PermissionGate>
  );
}

function MarkdownRenderer({ content }: { content: string }) {
  const lines = content.split("\n");
  const elements: React.ReactElement[] = [];
  let inCodeBlock = false;
  let codeContent: string[] = [];
  let inTable = false;
  let tableRows: string[][] = [];

  const processInline = (text: string): React.ReactNode => {
    text = text.replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-foreground">$1</strong>');
    text = text.replace(/\*(.+?)\*/g, '<em>$1</em>');
    text = text.replace(/`([^`]+)`/g, '<code class="bg-card px-1.5 py-0.5 rounded text-[13px]">$1</code>');
    text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-[#606338] no-underline hover:underline" target="_blank">$1</a>');
    return <span dangerouslySetInnerHTML={{ __html: text }} />;
  };

  lines.forEach((line, i) => {
    if (line.startsWith("```")) {
      if (inCodeBlock) {
        elements.push(
          <pre key={i} className="bg-card rounded-lg p-4 overflow-x-auto text-[13px] my-4 border border-border">
            <code className="text-muted-foreground">{codeContent.join("\n")}</code>
          </pre>
        );
        codeContent = [];
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
      }
      return;
    }
    if (inCodeBlock) { codeContent.push(line); return; }

    if (line.startsWith("|")) {
      const cells = line.split("|").filter(c => c.trim()).map(c => c.trim());
      if (cells.length > 0 && !line.includes("---")) {
        if (!inTable) inTable = true;
        tableRows.push(cells);
      }
      return;
    } else if (inTable) {
      elements.push(
        <div key={i} className="overflow-x-auto my-4">
          <table className="w-full text-[13px] border border-border rounded-lg">
            <thead>
              <tr className="bg-card">
                {tableRows[0]?.map((cell, ci) => (
                  <th key={ci} className="px-3 py-2.5 text-left font-medium text-foreground border-b border-border">{processInline(cell)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tableRows.slice(1).map((row, ri) => (
                <tr key={ri} className="border-b border-border">
                  {row.map((cell, ci) => (
                    <td key={ci} className="px-3 py-2.5 text-muted-foreground">{processInline(cell)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      tableRows = [];
      inTable = false;
    }

    if (!line.trim()) return;

    if (line.startsWith("# ")) {
      elements.push(<h1 key={i} className="text-2xl font-semibold text-foreground mt-6 mb-3">{line.slice(2)}</h1>);
    } else if (line.startsWith("## ")) {
      elements.push(<h2 key={i} className="text-xl font-semibold text-foreground mt-6 mb-2 pb-2 border-b border-border">{line.slice(3)}</h2>);
    } else if (line.startsWith("### ")) {
      elements.push(<h3 key={i} className="text-base font-medium text-foreground mt-4 mb-2">{line.slice(4)}</h3>);
    } else if (line.startsWith("#### ")) {
      elements.push(<h4 key={i} className="font-medium text-foreground mt-3 mb-1">{line.slice(5)}</h4>);
    } else if (line.startsWith("> ")) {
      elements.push(<blockquote key={i} className="border-l-2 border-[#606338] pl-4 my-3 text-muted-foreground italic">{processInline(line.slice(2))}</blockquote>);
    } else if (line.match(/^[-*] /)) {
      elements.push(<div key={i} className="flex gap-2 mt-1 ml-2"><span className="text-[#606338]">•</span><span className="text-muted-foreground">{processInline(line.slice(2))}</span></div>);
    } else if (line.match(/^\d+\. /)) {
      const match = line.match(/^(\d+)\. (.+)/);
      if (match) {
        elements.push(<div key={i} className="flex gap-2 mt-1 ml-2"><span className="text-[#606338] font-medium w-5">{match[1]}.</span><span className="text-muted-foreground">{processInline(match[2])}</span></div>);
      }
    } else if (line.match(/^---+$/)) {
      elements.push(<hr key={i} className="my-6 border-none border-t border-border" />);
    } else {
      elements.push(<p key={i} className="text-muted-foreground my-2 leading-relaxed">{processInline(line)}</p>);
    }
  });

  return <>{elements}</>;
}
