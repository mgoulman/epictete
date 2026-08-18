"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";

const ADMIN_PIN = "2025";

// Multi-language support
type Language = "en" | "fr";

const translations = {
  en: {
    // Login
    adminTitle: "Epictete Admin",
    dashboard: "Marketing Dashboard",
    accessCode: "Access Code",
    access: "Access",
    incorrectCode: "Incorrect code",
    
    // Header
    marketingDocs: "Marketing Docs",
    searchPlaceholder: "Search documents, topics, keywords...",
    logout: "Logout",
    home: "Home",
    
    // Search
    resultsFor: "results for",
    resultFor: "result for",
    foundIn: "Found in:",
    noResults: "No results for",
    tryOtherKeywords: "Try other keywords",
    name: "name",
    category: "category", 
    description: "description",
    keywords: "keywords",
    
    // Welcome
    docTitle: "Marketing Documentation",
    docSubtitle: "Select a document from the sidebar or use the search to find what you need.",
    
    // Developer message
    devMessage: "Developer Message",
    devMessageText: "Since I cannot verify all details personally at the restaurant, I would greatly appreciate your feedback and corrections. These documents constitute the",
    sourceOfTruth: "source of truth",
    devMessageText2: "on which the system will be built — the more accurate the data, the more effective and easier to maintain the system will be.",
    
    // Feedback
    sendCorrection: "Send a Correction",
    feedbackTitle: "Submit Feedback",
    feedbackDesc: "Help us improve by reporting errors or suggesting updates.",
    documentLabel: "Document",
    selectDocument: "Select document...",
    issueType: "Type of Issue",
    correction: "Correction",
    addition: "Addition",
    removal: "Removal",
    suggestion: "Suggestion",
    yourMessage: "Your Message",
    messagePlaceholder: "Describe the correction or suggestion in detail...",
    yourName: "Your Name (optional)",
    sendEmail: "Send via Email",
    cancel: "Cancel",
    
    // Audience
    viewAudience: "View Audience",
    audienceTitle: "Customer Personas",
    audienceSubtitle: "Visual overview of our 5 target audience segments",
    backToDocs: "Back to Docs",
    primaryMotivation: "Primary Motivation",
    budget: "Budget/Person",
    bestChannel: "Best Channel",
    keyMessage: "Key Message",
    ageRange: "Age Range",
    location: "Location",
    
    // Categories
    overview: "Overview",
    brand: "Brand",
    restaurant: "Restaurant",
    audience: "Audience",
    marketing: "Marketing",
    operations: "Operations",
    
    // Files
    files: {
      aiContext: { name: "AI Context (Master)", desc: "Complete overview for AI and new team members" },
      brandIdentity: { name: "Brand Identity", desc: "Brand identity, values and positioning" },
      brandVoice: { name: "Brand Voice", desc: "Brand communication tone and style" },
      visualGuidelines: { name: "Visual Guidelines", desc: "Graphic charter, colors and typography" },
      restaurantProfile: { name: "Restaurant Profile", desc: "Restaurant practical information" },
      menuCatalog: { name: "Menu Catalog", desc: "Complete catalog of dishes and prices" },
      storyOrigin: { name: "Story & Origin", desc: "Restaurant history and origin" },
      customerPersonas: { name: "Customer Personas", desc: "Target customer profiles" },
      marketingStrategy: { name: "Marketing Strategy", desc: "Marketing strategy and objectives" },
      contentPillars: { name: "Content Pillars", desc: "Content pillars and themes" },
      socialMediaGuide: { name: "Social Media Guide", desc: "Social media guide" },
      contactSocial: { name: "Contact & Social", desc: "Contact details and social links" },
    },
    
    // Footer
    organicFarm: "🌿 Fresh ingredients from our organic farm",
  },
  fr: {
    // Login
    adminTitle: "Epictete Admin",
    dashboard: "Tableau de bord Marketing",
    accessCode: "Code d'accès",
    access: "Accéder",
    incorrectCode: "Code incorrect",
    
    // Header
    marketingDocs: "Docs Marketing",
    searchPlaceholder: "Rechercher un document, sujet, mot-clé...",
    logout: "Déconnexion",
    home: "Accueil",
    
    // Search
    resultsFor: "résultats pour",
    resultFor: "résultat pour",
    foundIn: "Trouvé dans:",
    noResults: "Aucun résultat pour",
    tryOtherKeywords: "Essayez avec d'autres mots-clés",
    name: "nom",
    category: "catégorie",
    description: "description", 
    keywords: "mots-clés",
    
    // Welcome
    docTitle: "Documentation Marketing",
    docSubtitle: "Sélectionnez un document dans la barre latérale ou utilisez la recherche pour trouver ce dont vous avez besoin.",
    
    // Developer message
    devMessage: "Message du développeur",
    devMessageText: "Étant donné que je ne peux pas vérifier tous les détails personnellement au restaurant, j'apprécierais grandement vos retours et corrections. Ces documents constituent la",
    sourceOfTruth: "base de vérité",
    devMessageText2: "sur laquelle le système sera construit — plus les données sont précises, plus le système sera efficace et facile à maintenir.",
    
    // Feedback
    sendCorrection: "Envoyer une correction",
    feedbackTitle: "Soumettre un retour",
    feedbackDesc: "Aidez-nous à améliorer en signalant des erreurs ou en suggérant des mises à jour.",
    documentLabel: "Document",
    selectDocument: "Sélectionner un document...",
    issueType: "Type de problème",
    correction: "Correction",
    addition: "Ajout",
    removal: "Suppression",
    suggestion: "Suggestion",
    yourMessage: "Votre message",
    messagePlaceholder: "Décrivez la correction ou suggestion en détail...",
    yourName: "Votre nom (optionnel)",
    sendEmail: "Envoyer par email",
    cancel: "Annuler",
    
    // Audience
    viewAudience: "Voir l'audience",
    audienceTitle: "Personas Clients",
    audienceSubtitle: "Vue d'ensemble visuelle de nos 5 segments d'audience cibles",
    backToDocs: "Retour aux Docs",
    primaryMotivation: "Motivation principale",
    budget: "Budget/Personne",
    bestChannel: "Meilleur canal",
    keyMessage: "Message clé",
    ageRange: "Tranche d'âge",
    location: "Localisation",
    
    // Categories
    overview: "Aperçu",
    brand: "Marque",
    restaurant: "Restaurant",
    audience: "Audience",
    marketing: "Marketing",
    operations: "Opérations",
    
    // Files
    files: {
      aiContext: { name: "AI Context (Master)", desc: "Vue d'ensemble complète pour l'IA et les nouveaux membres" },
      brandIdentity: { name: "Brand Identity", desc: "Identité de marque, valeurs et positionnement" },
      brandVoice: { name: "Brand Voice", desc: "Ton et style de communication de la marque" },
      visualGuidelines: { name: "Visual Guidelines", desc: "Charte graphique, couleurs et typographies" },
      restaurantProfile: { name: "Restaurant Profile", desc: "Informations pratiques du restaurant" },
      menuCatalog: { name: "Menu Catalog", desc: "Catalogue complet des plats et prix" },
      storyOrigin: { name: "Story & Origin", desc: "Histoire et origine du restaurant" },
      customerPersonas: { name: "Customer Personas", desc: "Profils types des clients cibles" },
      marketingStrategy: { name: "Marketing Strategy", desc: "Stratégie et objectifs marketing" },
      contentPillars: { name: "Content Pillars", desc: "Piliers de contenu et thématiques" },
      socialMediaGuide: { name: "Social Media Guide", desc: "Guide des réseaux sociaux" },
      contactSocial: { name: "Contact & Social", desc: "Coordonnées et liens sociaux" },
    },
    
    // Footer
    organicFarm: "🌿 Ingrédients frais de notre ferme biologique",
  }
};

// Helper to get file key from path
const getFileKey = (path: string): keyof typeof translations.en.files => {
  const map: Record<string, keyof typeof translations.en.files> = {
    "AI_CONTEXT.md": "aiContext",
    "01-brand/BRAND_IDENTITY.md": "brandIdentity",
    "01-brand/BRAND_VOICE.md": "brandVoice",
    "01-brand/VISUAL_GUIDELINES.md": "visualGuidelines",
    "02-restaurant/RESTAURANT_PROFILE.md": "restaurantProfile",
    "02-restaurant/MENU_CATALOG.md": "menuCatalog",
    "02-restaurant/STORY_ORIGIN.md": "storyOrigin",
    "03-audience/CUSTOMER_PERSONAS.md": "customerPersonas",
    "04-marketing/MARKETING_STRATEGY.md": "marketingStrategy",
    "04-marketing/CONTENT_PILLARS.md": "contentPillars",
    "04-marketing/SOCIAL_MEDIA_GUIDE.md": "socialMediaGuide",
    "05-operations/CONTACT_SOCIAL.md": "contactSocial",
  };
  return map[path] || "aiContext";
};

interface MarketingFile {
  name: string;
  path: string;
  category: string;
  icon: string;
  keywords: string[]; // For smart search
  description: string; // Short description for search results
}

interface SearchResult {
  file: MarketingFile;
  score: number;
  matchedOn: string[];
}

const MARKETING_FILES: MarketingFile[] = [
  { 
    name: "AI Context (Master)", 
    path: "AI_CONTEXT.md", 
    category: "Overview", 
    icon: "🎯",
    keywords: ["ai", "contexte", "master", "résumé", "overview", "général", "complet", "tout"],
    description: "Vue d'ensemble complète pour l'IA et les nouveaux membres"
  },
  { 
    name: "Brand Identity", 
    path: "01-brand/BRAND_IDENTITY.md", 
    category: "Brand", 
    icon: "✨",
    keywords: ["marque", "identité", "brand", "valeurs", "mission", "vision", "épictète", "stoïcisme", "philosophie"],
    description: "Identité de marque, valeurs et positionnement"
  },
  { 
    name: "Brand Voice", 
    path: "01-brand/BRAND_VOICE.md", 
    category: "Brand", 
    icon: "💬",
    keywords: ["voix", "ton", "communication", "style", "écriture", "message", "parler"],
    description: "Ton et style de communication de la marque"
  },
  { 
    name: "Visual Guidelines", 
    path: "01-brand/VISUAL_GUIDELINES.md", 
    category: "Brand", 
    icon: "🎨",
    keywords: ["visuel", "design", "couleurs", "logo", "typographie", "fonts", "images", "photos", "or", "gold", "noir"],
    description: "Charte graphique, couleurs et typographies"
  },
  { 
    name: "Restaurant Profile", 
    path: "02-restaurant/RESTAURANT_PROFILE.md", 
    category: "Restaurant", 
    icon: "🏠",
    keywords: ["restaurant", "profil", "adresse", "horaires", "bouskoura", "localisation", "info", "contact", "téléphone"],
    description: "Informations pratiques du restaurant"
  },
  { 
    name: "Menu Catalog", 
    path: "02-restaurant/MENU_CATALOG.md", 
    category: "Restaurant", 
    icon: "📋",
    keywords: ["menu", "carte", "plats", "prix", "pizza", "pasta", "pâtes", "antipasti", "dessert", "boissons", "ingrédients"],
    description: "Catalogue complet des plats et prix"
  },
  { 
    name: "Story & Origin", 
    path: "02-restaurant/STORY_ORIGIN.md", 
    category: "Restaurant", 
    icon: "📖",
    keywords: ["histoire", "origine", "story", "fondateur", "création", "ferme", "bio", "organique"],
    description: "Histoire et origine du restaurant"
  },
  { 
    name: "Customer Personas", 
    path: "03-audience/CUSTOMER_PERSONAS.md", 
    category: "Audience", 
    icon: "👥",
    keywords: ["client", "persona", "cible", "audience", "profil", "démographie", "qui", "visiteur"],
    description: "Profils types des clients cibles"
  },
  { 
    name: "Marketing Strategy", 
    path: "04-marketing/MARKETING_STRATEGY.md", 
    category: "Marketing", 
    icon: "📈",
    keywords: ["stratégie", "marketing", "objectifs", "plan", "campagne", "promotion", "publicité"],
    description: "Stratégie et objectifs marketing"
  },
  { 
    name: "Content Pillars", 
    path: "04-marketing/CONTENT_PILLARS.md", 
    category: "Marketing", 
    icon: "🏛️",
    keywords: ["contenu", "piliers", "thèmes", "sujets", "posts", "articles", "idées"],
    description: "Piliers de contenu et thématiques"
  },
  { 
    name: "Social Media Guide", 
    path: "04-marketing/SOCIAL_MEDIA_GUIDE.md", 
    category: "Marketing", 
    icon: "📱",
    keywords: ["social", "media", "instagram", "facebook", "réseaux", "sociaux", "post", "story", "hashtag"],
    description: "Guide des réseaux sociaux"
  },
  { 
    name: "Contact & Social", 
    path: "05-operations/CONTACT_SOCIAL.md", 
    category: "Operations", 
    icon: "📞",
    keywords: ["contact", "téléphone", "email", "réservation", "whatsapp", "adresse", "liens"],
    description: "Coordonnées et liens sociaux"
  },
];

const CATEGORIES = [
  { name: "Overview", icon: "🎯", color: "text-yellow-500" },
  { name: "Brand", icon: "✨", color: "text-purple-500" },
  { name: "Restaurant", icon: "🍽️", color: "text-orange-500" },
  { name: "Audience", icon: "👥", color: "text-blue-500" },
  { name: "Marketing", icon: "📈", color: "text-green-500" },
  { name: "Operations", icon: "⚙️", color: "text-gray-500" },
];

// Customer Personas data for visual dashboard
const PERSONAS = [
  {
    id: "couple",
    emoji: "💑",
    name: { en: "Sofia & Karim", fr: "Sofia & Karim" },
    subtitle: { en: "The Affluent Couple", fr: "Le Couple Aisé" },
    color: "from-pink-500/20 to-rose-500/20",
    borderColor: "border-pink-500/30",
    accentColor: "text-pink-400",
    age: "28-45",
    location: { en: "Bouskoura, Prestigia, Anfa", fr: "Bouskoura, Prestigia, Anfa" },
    motivation: { en: "Discovery & Romance", fr: "Découverte & Romance" },
    budget: "400-500 MAD",
    channel: "Instagram",
    message: { en: "Date night, elevated", fr: "Soirée en amoureux, sublimée" },
    traits: { en: ["Instagram-savvy", "Quality seekers", "Experience-driven"], fr: ["Actifs sur Instagram", "Recherche qualité", "Amateurs d'expériences"] },
  },
  {
    id: "executive",
    emoji: "👔",
    name: { en: "Mehdi", fr: "Mehdi" },
    subtitle: { en: "The Business Executive", fr: "Le Cadre Dirigeant" },
    color: "from-blue-500/20 to-indigo-500/20",
    borderColor: "border-blue-500/30",
    accentColor: "text-blue-400",
    age: "35-60",
    location: { en: "Bouskoura Industrial Zone", fr: "Zone Industrielle Bouskoura" },
    motivation: { en: "Reliability & Status", fr: "Fiabilité & Statut" },
    budget: "600+ MAD",
    channel: "LinkedIn",
    message: { en: "For meetings that matter", fr: "Pour les réunions qui comptent" },
    traits: { en: ["Time-conscious", "Client-focused", "Status-aware"], fr: ["Conscient du temps", "Orienté client", "Soucieux du statut"] },
  },
  {
    id: "family",
    emoji: "👨‍👩‍👧‍👦",
    name: { en: "Leila & Hassan", fr: "Leila & Hassan" },
    subtitle: { en: "The Affluent Family", fr: "La Famille Aisée" },
    color: "from-amber-500/20 to-orange-500/20",
    borderColor: "border-amber-500/30",
    accentColor: "text-amber-400",
    age: "35-55",
    location: { en: "Bouskoura villas, Dar Bouazza", fr: "Villas Bouskoura, Dar Bouazza" },
    motivation: { en: "Quality Family Time", fr: "Moments en famille de qualité" },
    budget: "250-400 MAD",
    channel: "Facebook",
    message: { en: "Sundays for savoring together", fr: "Dimanches à savourer ensemble" },
    traits: { en: ["Weekend-focused", "Multi-generational", "Celebration-lovers"], fr: ["Axé week-end", "Multigénérationnel", "Amateurs de célébrations"] },
  },
  {
    id: "wellness",
    emoji: "🧘‍♀️",
    name: { en: "Yasmine", fr: "Yasmine" },
    subtitle: { en: "The Wellness Professional", fr: "La Pro du Bien-être" },
    color: "from-emerald-500/20 to-teal-500/20",
    borderColor: "border-emerald-500/30",
    accentColor: "text-emerald-400",
    age: "28-45",
    location: { en: "Prestigia, Golf City, Californie", fr: "Prestigia, Golf City, Californie" },
    motivation: { en: "Health & Values", fr: "Santé & Valeurs" },
    budget: "400-600 MAD",
    channel: "Instagram",
    message: { en: "Farm-fresh, soul-fed", fr: "Fraîcheur de la ferme, nourriture de l'âme" },
    traits: { en: ["Health-conscious", "Values-driven", "Organic advocate"], fr: ["Soucieuse de santé", "Guidée par ses valeurs", "Pro du bio"] },
  },
  {
    id: "youngpro",
    emoji: "🎯",
    name: { en: "Omar & Friends", fr: "Omar & Amis" },
    subtitle: { en: "The Social Young Professionals", fr: "Les Jeunes Pros Sociaux" },
    color: "from-violet-500/20 to-purple-500/20",
    borderColor: "border-violet-500/30",
    accentColor: "text-violet-400",
    age: "25-35",
    location: { en: "Casa center, Bouskoura zone", fr: "Centre Casa, Zone Bouskoura" },
    motivation: { en: "Social Currency", fr: "Capital Social" },
    budget: "250-400 MAD",
    channel: "Instagram/TikTok",
    message: { en: "Your next post, served", fr: "Ton prochain post, servi" },
    traits: { en: ["Trend-setters", "Group diners", "Content creators"], fr: ["Lanceurs de tendances", "Repas en groupe", "Créateurs de contenu"] },
  },
];

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [selectedFile, setSelectedFile] = useState<MarketingFile | null>(null);
  const [fileContent, setFileContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [expandedCategories, setExpandedCategories] = useState<string[]>(["Overview"]);
  const [lang, setLang] = useState<Language>("en");
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [showAudienceView, setShowAudienceView] = useState(false);
  const [feedbackDoc, setFeedbackDoc] = useState("");
  const [feedbackType, setFeedbackType] = useState("correction");
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [feedbackName, setFeedbackName] = useState("");

  // Get current translations
  const t = translations[lang];

  // Get translated file info
  const getFileInfo = useCallback((file: MarketingFile) => {
    const key = getFileKey(file.path);
    return t.files[key];
  }, [t]);

  // Get translated category name
  const getCategoryName = useCallback((category: string) => {
    const map: Record<string, string> = {
      "Overview": t.overview,
      "Brand": t.brand,
      "Restaurant": t.restaurant,
      "Audience": t.audience,
      "Marketing": t.marketing,
      "Operations": t.operations,
    };
    return map[category] || category;
  }, [t]);

  // Get translated match type
  const getMatchType = useCallback((match: string) => {
    const map: Record<string, string> = {
      "nom": t.name,
      "catégorie": t.category,
      "description": t.description,
      "mots-clés": t.keywords,
    };
    return map[match] || match;
  }, [t]);

  useEffect(() => {
    const saved = sessionStorage.getItem("admin_auth");
    if (saved === "true") setIsAuthenticated(true);
    // Load language preference
    const savedLang = localStorage.getItem("admin_lang") as Language;
    if (savedLang) setLang(savedLang);
  }, []);

  const toggleLanguage = () => {
    const newLang = lang === "en" ? "fr" : "en";
    setLang(newLang);
    localStorage.setItem("admin_lang", newLang);
  };

  // Reload file when language changes
  useEffect(() => {
    if (selectedFile && isAuthenticated) {
      loadFile(selectedFile);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isAuthenticated || !selectedFile) return;
      
      const currentIndex = MARKETING_FILES.findIndex(f => f.path === selectedFile.path);
      
      if (e.key === "ArrowLeft" || (e.key === "ArrowUp" && e.altKey)) {
        e.preventDefault();
        if (currentIndex > 0) loadFile(MARKETING_FILES[currentIndex - 1]);
      } else if (e.key === "ArrowRight" || (e.key === "ArrowDown" && e.altKey)) {
        e.preventDefault();
        if (currentIndex < MARKETING_FILES.length - 1) loadFile(MARKETING_FILES[currentIndex + 1]);
      } else if (e.key === "Escape") {
        setSelectedFile(null);
        setFileContent("");
      } else if (e.key === "/" && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        document.getElementById("search-input")?.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isAuthenticated, selectedFile]);

  // Smart search with relevance scoring
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return null;
    
    const q = searchQuery.toLowerCase().trim();
    const queryWords = q.split(/\s+/).filter(w => w.length > 1);
    
    const results: SearchResult[] = MARKETING_FILES.map(file => {
      let score = 0;
      const matchedOn: string[] = [];
      
      // Exact name match (highest priority)
      if (file.name.toLowerCase().includes(q)) {
        score += 50;
        matchedOn.push("nom");
      }
      
      // Category match
      if (file.category.toLowerCase().includes(q)) {
        score += 30;
        matchedOn.push("catégorie");
      }
      
      // Description match
      if (file.description.toLowerCase().includes(q)) {
        score += 25;
        matchedOn.push("description");
      }
      
      // Keyword matches (each keyword match adds points)
      queryWords.forEach(word => {
        file.keywords.forEach(keyword => {
          if (keyword.includes(word) || word.includes(keyword)) {
            score += 15;
            if (!matchedOn.includes("mots-clés")) matchedOn.push("mots-clés");
          }
        });
      });
      
      // Partial word matches in name
      queryWords.forEach(word => {
        if (file.name.toLowerCase().includes(word)) {
          score += 10;
        }
      });
      
      return { file, score, matchedOn };
    })
    .filter(r => r.score > 0)
    .sort((a, b) => b.score - a.score);
    
    // Normalize scores to percentages (max score becomes 100%)
    const maxScore = results.length > 0 ? results[0].score : 1;
    return results.map(r => ({
      ...r,
      score: Math.round((r.score / maxScore) * 100)
    }));
  }, [searchQuery]);

  const filteredFiles = useMemo(() => {
    if (searchResults) return searchResults.map(r => r.file);
    return MARKETING_FILES;
  }, [searchResults]);

  const filesByCategory = useMemo(() => {
    const grouped: Record<string, MarketingFile[]> = {};
    filteredFiles.forEach(file => {
      if (!grouped[file.category]) grouped[file.category] = [];
      grouped[file.category].push(file);
    });
    return grouped;
  }, [filteredFiles]);

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin === ADMIN_PIN) {
      setIsAuthenticated(true);
      sessionStorage.setItem("admin_auth", "true");
      setError("");
    } else {
      setError("Code incorrect");
      setPin("");
    }
  };

  const loadFile = useCallback(async (file: MarketingFile) => {
    setLoading(true);
    setSelectedFile(file);
    // Auto-expand category
    if (!expandedCategories.includes(file.category)) {
      setExpandedCategories(prev => [...prev, file.category]);
    }
    try {
      // Determine file path based on language
      let filePath = file.path;
      if (lang === "fr") {
        // Try to load French version (e.g., BRAND_IDENTITY.md -> BRAND_IDENTITY_FR.md)
        filePath = file.path.replace(".md", "_FR.md");
      }
      
      let res = await fetch(`/api/marketing-files?path=${encodeURIComponent(filePath)}`);
      
      // If French file doesn't exist, fallback to English
      if (!res.ok && lang === "fr") {
        res = await fetch(`/api/marketing-files?path=${encodeURIComponent(file.path)}`);
      }
      
      if (!res.ok) throw new Error("Failed to load file");
      const data = await res.json();
      setFileContent(data.content);
      // Scroll to top of content
      document.getElementById("file-content")?.scrollTo(0, 0);
    } catch {
      setFileContent("Erreur lors du chargement du fichier.");
    }
    setLoading(false);
  }, [expandedCategories, lang]);

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev =>
      prev.includes(category) ? prev.filter(c => c !== category) : [...prev, category]
    );
  };

  const currentIndex = selectedFile ? MARKETING_FILES.findIndex(f => f.path === selectedFile.path) : -1;
  const prevFile = currentIndex > 0 ? MARKETING_FILES[currentIndex - 1] : null;
  const nextFile = currentIndex < MARKETING_FILES.length - 1 ? MARKETING_FILES[currentIndex + 1] : null;

  // PIN Entry Screen
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <div className="bg-card border border-border rounded-2xl p-8 shadow-xl">
            {/* Language Toggle on Login */}
            <div className="flex justify-end mb-4">
              <button
                onClick={toggleLanguage}
                className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-secondary hover:bg-border text-xs font-medium transition-colors"
              >
                {lang === "en" ? "🇬🇧 EN" : "🇫🇷 FR"}
              </button>
            </div>
            
            <div className="text-center mb-8">
              <div className="text-4xl mb-3">🔐</div>
              <h1 className="text-2xl font-heading text-accent mb-2">{t.adminTitle}</h1>
              <p className="text-muted-foreground text-sm">{t.dashboard}</p>
            </div>
            
            <form onSubmit={handlePinSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  {t.accessCode}
                </label>
                <input
                  type="password"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="••••"
                  maxLength={6}
                  className="w-full px-4 py-3 bg-secondary border border-border rounded-lg text-center text-2xl tracking-widest text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
                  autoFocus
                />
                {error && <p className="mt-2 text-red-500 text-sm text-center">{t.incorrectCode}</p>}
              </div>
              <Button type="submit" className="w-full" size="lg">{t.access}</Button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // Dashboard
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card/95 backdrop-blur border-b border-border">
        <div className="px-4 py-3 flex items-center gap-4">
          {/* Toggle Sidebar */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-lg hover:bg-secondary transition-colors lg:hidden"
            aria-label="Toggle sidebar"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          {/* Logo */}
          <div className="flex items-center gap-3">
            <span className="text-2xl">🍽️</span>
            <div>
              <h1 className="text-lg font-heading text-accent leading-tight">Epictete</h1>
              <p className="text-xs text-muted-foreground hidden sm:block">{t.marketingDocs}</p>
            </div>
          </div>

          {/* Search with Results Dropdown */}
          <div className="flex-1 max-w-xl mx-4 relative">
            <div className="relative">
              <input
                id="search-input"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t.searchPlaceholder}
                className="w-full pl-10 pr-10 py-2.5 bg-secondary border border-border rounded-xl text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
              />
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground transition-colors"
                >
                  ✕
                </button>
              )}
            </div>
            
            {/* Search Results Dropdown */}
            {searchResults && searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-xl shadow-xl overflow-hidden z-50 max-h-[400px] overflow-y-auto">
                <div className="px-3 py-2 bg-secondary/50 border-b border-border">
                  <span className="text-xs text-muted-foreground">
                    {searchResults.length} {searchResults.length > 1 ? t.resultsFor : t.resultFor} &quot;{searchQuery}&quot;
                  </span>
                </div>
                {searchResults.map((result, idx) => {
                  const fileInfo = getFileInfo(result.file);
                  return (
                  <button
                    key={result.file.path}
                    onClick={() => {
                      loadFile(result.file);
                      setSearchQuery("");
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-secondary ${
                      idx !== searchResults.length - 1 ? "border-b border-border/50" : ""
                    }`}
                  >
                    <span className="text-2xl shrink-0">{result.file.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground truncate">{fileInfo.name}</span>
                        <span className="text-xs text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">
                          {getCategoryName(result.file.category)}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {fileInfo.desc}
                      </p>
                      {result.matchedOn.length > 0 && (
                        <p className="text-xs text-accent/70 mt-1">
                          {t.foundIn} {result.matchedOn.map(m => getMatchType(m)).join(", ")}
                        </p>
                      )}
                    </div>
                    <div className="shrink-0 flex flex-col items-end">
                      <div className={`text-sm font-semibold ${
                        result.score >= 80 ? "text-green-500" : 
                        result.score >= 50 ? "text-accent" : "text-muted-foreground"
                      }`}>
                        {result.score}%
                      </div>
                      <div className="w-12 h-1.5 bg-secondary rounded-full overflow-hidden mt-1">
                        <div 
                          className={`h-full rounded-full transition-all ${
                            result.score >= 80 ? "bg-green-500" : 
                            result.score >= 50 ? "bg-accent" : "bg-muted-foreground"
                          }`}
                          style={{ width: `${result.score}%` }}
                        />
                      </div>
                    </div>
                  </button>
                )})}
              </div>
            )}
            
            {/* No Results */}
            {searchResults && searchResults.length === 0 && searchQuery.trim() && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-xl shadow-xl p-4 z-50">
                <p className="text-sm text-muted-foreground text-center">
                  {t.noResults} &quot;{searchQuery}&quot;
                </p>
                <p className="text-xs text-muted text-center mt-1">
                  {t.tryOtherKeywords}
                </p>
              </div>
            )}
          </div>

          {/* Language Toggle */}
          <button
            onClick={toggleLanguage}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary hover:bg-border text-sm font-medium transition-colors"
            title={lang === "en" ? "Switch to French" : "Passer en anglais"}
          >
            {lang === "en" ? "🇬🇧" : "🇫🇷"}
            <span className="hidden sm:inline">{lang.toUpperCase()}</span>
          </button>
        </div>

        {/* Breadcrumb */}
        {selectedFile && (
          <div className="px-4 py-2 bg-secondary/50 border-t border-border flex items-center gap-2 text-sm overflow-x-auto">
            <button onClick={() => { setSelectedFile(null); setFileContent(""); }} className="text-muted-foreground hover:text-foreground">
              🏠 {t.home}
            </button>
            <span className="text-muted">›</span>
            <span className="text-muted-foreground">{getCategoryName(selectedFile.category)}</span>
            <span className="text-muted">›</span>
            <span className="text-accent font-medium truncate">{getFileInfo(selectedFile).name}</span>
            <span className="ml-auto text-xs text-muted whitespace-nowrap">
              {currentIndex + 1} / {MARKETING_FILES.length}
            </span>
          </div>
        )}
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className={`${sidebarOpen ? "w-72" : "w-0"} transition-all duration-300 overflow-hidden border-r border-border bg-card/50 flex-shrink-0`}>
          <div className="w-72 h-full overflow-y-auto p-4 space-y-2">
            {CATEGORIES.map((cat) => {
              const files = filesByCategory[cat.name] || [];
              const isExpanded = expandedCategories.includes(cat.name);
              const hasFiles = files.length > 0;
              
              return (
                <div key={cat.name} className="rounded-lg overflow-hidden">
                  {/* Category Header */}
                  <button
                    onClick={() => toggleCategory(cat.name)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                      hasFiles ? "hover:bg-secondary" : "opacity-50 cursor-not-allowed"
                    } ${isExpanded && hasFiles ? "bg-secondary" : ""}`}
                    disabled={!hasFiles}
                  >
                    <span className="text-lg">{cat.icon}</span>
                    <span className="font-medium text-foreground flex-1 text-left">{getCategoryName(cat.name)}</span>
                    <span className="text-xs text-muted bg-secondary/80 px-1.5 py-0.5 rounded">
                      {files.length}
                    </span>
                    {hasFiles && (
                      <svg
                        className={`w-4 h-4 text-muted transition-transform ${isExpanded ? "rotate-180" : ""}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    )}
                  </button>

                  {/* Files List */}
                  {isExpanded && hasFiles && (
                    <div className="mt-1 ml-4 pl-4 border-l border-border space-y-1">
                      {files.map((file) => {
                        const info = getFileInfo(file);
                        return (
                        <button
                          key={file.path}
                          onClick={() => loadFile(file)}
                          className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all ${
                            selectedFile?.path === file.path
                              ? "bg-accent/20 text-accent border border-accent/30"
                              : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                          }`}
                        >
                          <span>{file.icon}</span>
                          <span className="truncate">{info.name}</span>
                        </button>
                      );})}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Tools Section */}
            <div className="mt-6 pt-4 border-t border-border">
              <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Outils
              </div>
              <a
                href="/admin/menu"
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all hover:bg-secondary text-muted-foreground hover:text-foreground"
              >
                <span className="text-lg">📸</span>
                <span className="font-medium flex-1">Menu Images</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </a>
            </div>

          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-hidden flex flex-col">
          {!selectedFile ? (
            // Welcome Screen
            <div className="flex-1 flex items-center justify-center p-8">
              <div className="text-center max-w-lg">
                <div className="text-6xl mb-6">📚</div>
                <h2 className="text-2xl font-heading text-foreground mb-3">
                  {t.docTitle}
                </h2>
                <p className="text-muted-foreground mb-8">
                  {t.docSubtitle}
                </p>
                
                {/* Quick Access Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {MARKETING_FILES.slice(0, 6).map((file) => {
                    const info = getFileInfo(file);
                    return (
                    <button
                      key={file.path}
                      onClick={() => loadFile(file)}
                      className="p-4 bg-card border border-border rounded-xl hover:border-accent/50 hover:bg-secondary/50 transition-all text-left group"
                    >
                      <span className="text-2xl mb-2 block">{file.icon}</span>
                      <span className="text-sm text-foreground group-hover:text-accent transition-colors line-clamp-2">
                        {info.name}
                      </span>
                    </button>
                  );})}
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-3 justify-center mt-6">
                  <button
                    onClick={() => setShowFeedbackModal(true)}
                    className="flex items-center gap-2 px-4 py-2.5 bg-accent/10 border border-accent/30 rounded-xl text-accent hover:bg-accent/20 transition-colors text-sm font-medium"
                  >
                    <span>✉️</span>
                    {t.sendCorrection}
                  </button>
                  <button
                    onClick={() => setShowAudienceView(true)}
                    className="flex items-center gap-2 px-4 py-2.5 bg-blue-500/10 border border-blue-500/30 rounded-xl text-blue-400 hover:bg-blue-500/20 transition-colors text-sm font-medium"
                  >
                    <span>👥</span>
                    {t.viewAudience}
                  </button>
                </div>

                {/* Developer Message */}
                <div className="mt-8 p-4 bg-accent/5 border border-accent/20 rounded-xl text-left">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl shrink-0">💬</span>
                    <div>
                      <p className="text-sm font-medium text-accent mb-2">{t.devMessage}</p>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {t.devMessageText}
                        <span className="text-foreground font-medium"> {t.sourceOfTruth} </span> 
                        {t.devMessageText2}
                      </p>
                      <p className="text-xs text-accent/70 mt-3 text-right">— Youssef</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            // File Content
            <div id="file-content" className="flex-1 overflow-y-auto">
              <div className="max-w-4xl mx-auto p-6 lg:p-8">
                {loading ? (
                  <div className="flex items-center justify-center py-20">
                    <div className="animate-spin rounded-full h-10 w-10 border-2 border-accent border-t-transparent"></div>
                  </div>
                ) : (
                  <div className="prose prose-invert prose-sm max-w-none">
                    <MarkdownRenderer content={fileContent} />
                  </div>
                )}
              </div>

              {/* Bottom Navigation */}
              <div className="sticky bottom-0 bg-card/95 backdrop-blur border-t border-border p-4">
                <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
                  {prevFile ? (
                    <button
                      onClick={() => loadFile(prevFile)}
                      className="flex items-center gap-2 px-4 py-2 bg-secondary rounded-lg hover:bg-border transition-colors text-sm"
                    >
                      <span>←</span>
                      <span className="hidden sm:inline truncate max-w-[150px]">{prevFile.name}</span>
                      <span className="sm:hidden">Précédent</span>
                    </button>
                  ) : (
                    <div />
                  )}
                  
                  <button
                    onClick={() => document.getElementById("file-content")?.scrollTo({ top: 0, behavior: "smooth" })}
                    className="p-2 bg-secondary rounded-lg hover:bg-border transition-colors"
                    title="Retour en haut"
                  >
                    ↑
                  </button>

                  {nextFile ? (
                    <button
                      onClick={() => loadFile(nextFile)}
                      className="flex items-center gap-2 px-4 py-2 bg-secondary rounded-lg hover:bg-border transition-colors text-sm"
                    >
                      <span className="hidden sm:inline truncate max-w-[150px]">{nextFile.name}</span>
                      <span className="sm:hidden">Suivant</span>
                      <span>→</span>
                    </button>
                  ) : (
                    <div />
                  )}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Feedback Modal */}
      {showFeedbackModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-2xl w-full max-w-lg shadow-2xl">
            <div className="p-6 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="text-lg font-heading text-foreground">{t.feedbackTitle}</h3>
                <p className="text-sm text-muted-foreground mt-1">{t.feedbackDesc}</p>
              </div>
              <button onClick={() => setShowFeedbackModal(false)} className="p-2 hover:bg-secondary rounded-lg">✕</button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">{t.documentLabel}</label>
                <select value={feedbackDoc} onChange={(e) => setFeedbackDoc(e.target.value)} className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-foreground text-sm">
                  <option value="">{t.selectDocument}</option>
                  {MARKETING_FILES.map((file) => (<option key={file.path} value={file.name}>{file.icon} {file.name}</option>))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">{t.issueType}</label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { key: "correction", emoji: "✏️", label: t.correction },
                    { key: "addition", emoji: "➕", label: t.addition },
                    { key: "removal", emoji: "🗑️", label: t.removal },
                    { key: "suggestion", emoji: "💡", label: t.suggestion },
                  ].map((type) => (
                    <button key={type.key} onClick={() => setFeedbackType(type.key)} className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${feedbackType === type.key ? "bg-accent text-background" : "bg-secondary hover:bg-border"}`}>
                      {type.emoji} {type.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">{t.yourMessage}</label>
                <textarea value={feedbackMessage} onChange={(e) => setFeedbackMessage(e.target.value)} placeholder={t.messagePlaceholder} rows={4} className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-foreground text-sm resize-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">{t.yourName}</label>
                <input type="text" value={feedbackName} onChange={(e) => setFeedbackName(e.target.value)} className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-foreground text-sm" />
              </div>
            </div>
            <div className="p-6 border-t border-border flex gap-3 justify-end">
              <Button variant="ghost" onClick={() => setShowFeedbackModal(false)}>{t.cancel}</Button>
              <Button onClick={() => {
                const subject = encodeURIComponent(`[Epictete Docs] ${feedbackType}: ${feedbackDoc || "General"}`);
                const body = encodeURIComponent(`Document: ${feedbackDoc || "General"}\nType: ${feedbackType}\nFrom: ${feedbackName || "Anonymous"}\n\n${feedbackMessage}`);
                window.open(`mailto:youssef@epictete.ma?subject=${subject}&body=${body}`, "_blank");
                setShowFeedbackModal(false);
                setFeedbackDoc(""); setFeedbackType("correction"); setFeedbackMessage(""); setFeedbackName("");
              }}>{t.sendEmail}</Button>
            </div>
          </div>
        </div>
      )}

      {/* Audience View Modal */}
      {showAudienceView && (
        <div className="fixed inset-0 z-50 bg-background overflow-y-auto">
          <div className="min-h-screen p-6 lg:p-8">
            <div className="max-w-6xl mx-auto">
              {/* Header */}
              <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 pb-6 border-b border-border">
                <div className="flex items-center gap-4">
                  <span className="text-4xl">👥</span>
                  <div>
                    <h1 className="text-2xl font-heading text-accent">{t.audienceTitle}</h1>
                    <p className="text-sm text-muted-foreground mt-1">{t.audienceSubtitle}</p>
                  </div>
                </div>
                <button onClick={() => setShowAudienceView(false)} className="flex items-center gap-2 px-4 py-2.5 bg-secondary border border-border rounded-xl hover:bg-border transition-colors text-sm">
                  ← {t.backToDocs}
                </button>
              </header>

              {/* Personas Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {PERSONAS.map((persona) => (
                  <article key={persona.id} className={`bg-gradient-to-br ${persona.color} border ${persona.borderColor} rounded-2xl overflow-hidden hover:scale-[1.02] transition-transform`}>
                    {/* Card Header */}
                    <div className="p-5 border-b border-white/10">
                      <div className="flex items-center gap-3">
                        <span className="text-3xl">{persona.emoji}</span>
                        <div>
                          <h2 className={`font-heading text-lg ${persona.accentColor}`}>{persona.name[lang]}</h2>
                          <p className="text-xs text-muted-foreground">{persona.subtitle[lang]}</p>
                        </div>
                      </div>
                    </div>
                    
                    {/* Card Body */}
                    <div className="p-5 space-y-4">
                      {/* Demographics */}
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-muted-foreground text-xs mb-1">{t.ageRange}</p>
                          <p className="text-foreground font-medium">{persona.age}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs mb-1">{t.location}</p>
                          <p className="text-foreground font-medium text-xs">{persona.location[lang]}</p>
                        </div>
                      </div>
                      
                      {/* Key Metrics */}
                      <div className="grid grid-cols-2 gap-3 text-sm pt-3 border-t border-white/10">
                        <div>
                          <p className="text-muted-foreground text-xs mb-1">{t.primaryMotivation}</p>
                          <p className={`${persona.accentColor} font-medium text-sm`}>{persona.motivation[lang]}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs mb-1">{t.budget}</p>
                          <p className="text-foreground font-medium">{persona.budget}</p>
                        </div>
                      </div>
                      
                      {/* Channel */}
                      <div className="text-sm">
                        <p className="text-muted-foreground text-xs mb-1">{t.bestChannel}</p>
                        <p className="text-foreground font-medium">{persona.channel}</p>
                      </div>
                      
                      {/* Key Message */}
                      <div className="pt-3 border-t border-white/10">
                        <p className="text-muted-foreground text-xs mb-2">{t.keyMessage}</p>
                        <p className={`${persona.accentColor} font-medium italic text-sm`}>&ldquo;{persona.message[lang]}&rdquo;</p>
                      </div>
                      
                      {/* Traits */}
                      <div className="flex flex-wrap gap-1.5 pt-2">
                        {persona.traits[lang].map((trait, i) => (
                          <span key={i} className="px-2 py-1 bg-white/5 border border-white/10 rounded-full text-xs text-muted-foreground">{trait}</span>
                        ))}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Markdown Renderer
function MarkdownRenderer({ content }: { content: string }) {
  const lines = content.split("\n");
  const elements: React.ReactElement[] = [];
  let inCodeBlock = false;
  let codeContent: string[] = [];
  let inTable = false;
  let tableRows: string[][] = [];

  const processInlineStyles = (text: string): React.ReactNode => {
    text = text.replace(/\*\*(.+?)\*\*/g, '<strong class="text-foreground font-semibold">$1</strong>');
    text = text.replace(/\*(.+?)\*/g, '<em>$1</em>');
    text = text.replace(/`([^`]+)`/g, '<code class="bg-secondary px-1.5 py-0.5 rounded text-accent text-xs">$1</code>');
    text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-accent hover:underline" target="_blank">$1</a>');
    return <span dangerouslySetInnerHTML={{ __html: text }} />;
  };

  lines.forEach((line, i) => {
    if (line.startsWith("```")) {
      if (inCodeBlock) {
        elements.push(
          <pre key={i} className="bg-secondary border border-border rounded-lg p-4 overflow-x-auto text-xs my-4">
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
          <table className="w-full text-sm border border-border rounded-lg overflow-hidden">
            <thead>
              <tr className="bg-secondary">
                {tableRows[0]?.map((cell, ci) => (
                  <th key={ci} className="px-4 py-2 text-left text-accent font-medium border-b border-border">
                    {processInlineStyles(cell)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tableRows.slice(1).map((row, ri) => (
                <tr key={ri} className="border-b border-border last:border-0 hover:bg-secondary/50">
                  {row.map((cell, ci) => (
                    <td key={ci} className="px-4 py-2 text-muted-foreground">{processInlineStyles(cell)}</td>
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
      elements.push(<h1 key={i} className="text-3xl font-heading text-accent mt-8 mb-4 first:mt-0">{line.slice(2)}</h1>);
      return;
    }
    if (line.startsWith("## ")) {
      elements.push(<h2 key={i} className="text-2xl font-heading text-foreground mt-8 mb-3 pb-2 border-b border-border">{line.slice(3)}</h2>);
      return;
    }
    if (line.startsWith("### ")) {
      elements.push(<h3 key={i} className="text-xl font-heading text-foreground mt-6 mb-2">{line.slice(4)}</h3>);
      return;
    }
    if (line.startsWith("#### ")) {
      elements.push(<h4 key={i} className="text-lg font-medium text-foreground mt-4 mb-2">{line.slice(5)}</h4>);
      return;
    }
    if (line.startsWith("> ")) {
      elements.push(
        <blockquote key={i} className="border-l-4 border-accent pl-4 my-4 text-muted-foreground italic">
          {processInlineStyles(line.slice(2))}
        </blockquote>
      );
      return;
    }
    if (line.match(/^[-*] /)) {
      elements.push(
        <div key={i} className="flex items-start gap-2 my-1 ml-4">
          <span className="text-accent mt-1">•</span>
          <span className="text-muted-foreground">{processInlineStyles(line.slice(2))}</span>
        </div>
      );
      return;
    }
    if (line.match(/^\d+\. /)) {
      const match = line.match(/^(\d+)\. (.+)/);
      if (match) {
        elements.push(
          <div key={i} className="flex items-start gap-2 my-1 ml-4">
            <span className="text-accent font-medium min-w-6">{match[1]}.</span>
            <span className="text-muted-foreground">{processInlineStyles(match[2])}</span>
          </div>
        );
      }
      return;
    }
    if (line.match(/^---+$/)) {
      elements.push(<hr key={i} className="my-8 border-border" />);
      return;
    }
    if (line.startsWith("✅") || line.startsWith("❌")) {
      elements.push(<div key={i} className="my-1 text-muted-foreground">{processInlineStyles(line)}</div>);
      return;
    }

    elements.push(<p key={i} className="text-muted-foreground my-2 leading-relaxed">{processInlineStyles(line)}</p>);
  });

  if (inTable && tableRows.length > 0) {
    elements.push(
      <div key="final-table" className="overflow-x-auto my-4">
        <table className="w-full text-sm border border-border rounded-lg overflow-hidden">
          <thead>
            <tr className="bg-secondary">
              {tableRows[0]?.map((cell, ci) => (
                <th key={ci} className="px-4 py-2 text-left text-accent font-medium border-b border-border">
                  {processInlineStyles(cell)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tableRows.slice(1).map((row, ri) => (
              <tr key={ri} className="border-b border-border last:border-0 hover:bg-secondary/50">
                {row.map((cell, ci) => (
                  <td key={ci} className="px-4 py-2 text-muted-foreground">{processInlineStyles(cell)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return <>{elements}</>;
}
