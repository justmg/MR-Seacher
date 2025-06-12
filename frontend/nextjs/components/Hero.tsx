import React, { FC } from "react";
import InputArea from "./ResearchBlocks/elements/InputArea";

type THeroProps = {
  promptValue: string;
  setPromptValue: React.Dispatch<React.SetStateAction<string>>;
  handleDisplayResult: (query : string) => void;
};

const Hero: FC<THeroProps> = ({
  promptValue,
  setPromptValue,
  handleDisplayResult,
}) => {

  const handleClickSuggestion = (value: string) => {
    setPromptValue(value);
  };

  return (
    <div className="relative flex flex-col items-center justify-center w-full min-h-[80vh]">
      <div className="text-center">
        <h1 className="text-5xl font-bold">FAR Part 10 Automated Market Research</h1>
        <p className="mt-4 text-xl">
          Your AI partner for efficient, compliant, and comprehensive market analysis for government acquisitions.
        </p>
      </div>

      <div className="w-full max-w-2xl mt-8">
        <InputArea
          promptValue={promptValue}
          setPromptValue={setPromptValue}
          handleSubmit={handleDisplayResult}
        />
      </div>

      <div className="flex flex-wrap items-center justify-center gap-4 mt-8">
        {suggestions.map((item) => (
          <button
            key={item.id}
            className="px-4 py-2 text-white bg-gray-700 rounded-lg hover:bg-gray-600"
            onClick={() => handleClickSuggestion(item.name)}
          >
            {item.name}
          </button>
        ))}
      </div>
    </div>
  );
};

export default Hero;

type suggestionType = {
  id: number;
  name: string;
  icon: string;
};

const suggestions: suggestionType[] = [
  {
    id: 1,
    name: "Small Business Search",
    icon: "/icons/cube.svg",
  },
  {
    id: 2,
    name: "Vendor Analysis",
    icon: "/icons/book.svg",
  },
  {
    id: 3,
    name: "NAICS Code Lookup",
    icon: "/icons/search.svg",
  },
  {
    id: 4,
    name: "Historical Contract Data",
    icon: "/icons/chart.svg",
  },
];
