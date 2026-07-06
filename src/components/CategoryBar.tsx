import { CategoryType } from '../types';

interface CategoryBarProps {
  activeCategory: CategoryType;
  onSelectCategory: (category: CategoryType) => void;
}

const CATEGORIES: CategoryType[] = [
  'All',
  'Sports',
  'Bangla',
  'Hindi',
  'Movie',
  'Music',
  'Kids',
  'Documentary',
];

export default function CategoryBar({
  activeCategory,
  onSelectCategory,
}: CategoryBarProps) {
  return (
    <div
      id="category-bar"
      className="flex flex-wrap gap-[10px] justify-center mb-[35px]"
    >
      {CATEGORIES.map((category) => {
        const isActive = activeCategory === category;
        return (
          <button
            key={category}
            data-category={category}
            onClick={() => onSelectCategory(category)}
            tabIndex={0}
            className={`category-btn px-5 py-2 rounded-full text-[15px] font-medium cursor-pointer transition-all duration-300 outline-none select-none
              ${
                isActive
                  ? 'bg-[#00ffcc] text-black border border-[#00ffcc] font-bold shadow-[0_0_15px_rgba(0,255,204,0.4)]'
                  : 'bg-[#111] text-[#ccc] border border-[#222]'
              }
              hover:bg-[#00ffcc] hover:text-black hover:border-white hover:shadow-[0_0_15px_#00ffcc] hover:-translate-y-0.5
              focus:bg-[#00ffcc] focus:text-black focus:border-white focus:shadow-[0_0_15px_#00ffcc] focus:-translate-y-0.5
              active:scale-95
            `}
          >
            {category}
          </button>
        );
      })}
    </div>
  );
}
