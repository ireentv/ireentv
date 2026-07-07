import { Search, Heart, Star, Sparkles, Flame, Tv } from "lucide-react";
import { Category } from "../types";

interface SearchAndFiltersProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  activeCategory: Category;
  setActiveCategory: (cat: Category) => void;
  favoriteCount: number;
}

export default function SearchAndFilters({
  searchTerm,
  setSearchTerm,
  activeCategory,
  setActiveCategory,
  favoriteCount,
}: SearchAndFiltersProps) {
  const categories: { key: Category; label: string }[] = [
    { key: "All", label: "All Streams" },
    { key: "Premium Sports", label: "Premium Sports" },
    { key: "Bangla", label: "Bangla" },
    { key: "Documentary", label: "Documentaries" },
    { key: "International News", label: "Live News" },
    { key: "Entertainment Hindi", label: "Hindi Series" },
    { key: "Music", label: "Melodic Music" },
    { key: "Kids", label: "Kids" },
    { key: "Favorites", label: `My List (${favoriteCount})` },
  ];

  return (
    <div className="flex flex-col gap-4 w-full bg-[#12151c] border border-slate-800 rounded-2xl p-4 shadow-xl">
      {/* Search Input box */}
      <div className="relative w-full group">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500 group-focus-within:text-blue-500 transition-colors">
          <Search className="w-4 h-4" />
        </div>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search your favorite streaming channels..."
          className="w-full pl-11 pr-4 py-3 bg-slate-950/80 border border-slate-800 focus:border-[#E50914] focus:outline-none focus:ring-1 focus:ring-[#E50914]/30 text-sm rounded-xl text-slate-200 placeholder-slate-500 font-sans transition-all"
        />
        {searchTerm && (
          <button
            onClick={() => setSearchTerm("")}
            className="absolute inset-y-0 right-0 pr-4 flex items-center text-xs text-slate-400 hover:text-[#E50914] font-sans cursor-pointer"
          >
            Clear
          </button>
        )}
      </div>

      {/* Quick filter tabs collection */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar scroll-smooth">
        {categories.map((cat) => {
          const isSelected = activeCategory === cat.key;
          return (
            <button
              key={cat.key}
              onClick={() => setActiveCategory(cat.key)}
              className={`whitespace-nowrap px-4 py-2 text-xs font-semibold rounded-lg font-sans transition-all cursor-pointer ${
                isSelected
                  ? "bg-[#E50914] text-white shadow-md shadow-[#E50914]/10 scale-[1.02]"
                  : "bg-slate-950/70 text-slate-400 border border-slate-800/80 hover:border-slate-700 hover:text-slate-200"
              }`}
            >
              <span className="flex items-center gap-1.5">
                {cat.key === "Favorites" ? (
                  <Heart className={`w-3.5 h-3.5 ${isSelected ? "fill-white text-white" : "fill-none text-slate-500"}`} />
                ) : cat.key === "Premium Sports" ? (
                  <Flame className="w-3.5 h-3.5" />
                ) : cat.key === "Documentary" ? (
                  <Sparkles className="w-3.5 h-3.5" />
                ) : null}
                {cat.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
