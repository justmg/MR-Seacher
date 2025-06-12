import Image from "next/image";
import React, { FC, useEffect, useState, useRef } from "react";
import InputArea from "./ResearchBlocks/elements/InputArea";
import { motion, AnimatePresence } from "framer-motion";

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
  const [isVisible, setIsVisible] = useState(false);
  
  useEffect(() => {
    setIsVisible(true);
  }, []);

  const handleClickSuggestion = (value: string) => {
    setPromptValue(value);
  };

  // Animation variants for consistent animations
  const fadeInUp = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <div className="relative overflow-visible min-h-[80vh] sm:min-h-[85vh] flex items-center pt-[60px] sm:pt-[80px] mt-[-60px] sm:mt-[-130px]">
      
      <motion.div 
        initial="hidden"
        animate={isVisible ? "visible" : "hidden"}
        variants={fadeInUp}
        transition={{ duration: 0.8 }}
        className="flex flex-col items-center justify-center w-full py-6 sm:py-8 md:py-16 lg:pt-10 lg:pb-20"
      >
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: isVisible ? 1 : 0, scale: isVisible ? 1 : 0.95 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="landing flex flex-col items-center mb-4 sm:mb-6 md:mb-8"
        >
          <motion.h1 
            className="text-3xl xs:text-4xl sm:text-5xl font-black text-center lg:text-7xl mb-1 sm:mb-2 tracking-tight"
            variants={fadeInUp}
            transition={{ duration: 0.8, delay: 0.4 }}
          >
            <div className="mb-2 xs:mb-3 sm:mb-1 md:mb-0">FAR Part 10</div>
            <span
              style={{
                backgroundImage: 'linear-gradient(to right, #a855f7, #e879f9, #f472b6)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                display: 'block',
                lineHeight: '1.2',
                paddingBottom: '0.1em'
              }}
            >
              Automated Market Research
            </span>
          </motion.h1>
          <motion.h2 
            className="text-base sm:text-xl font-light text-center px-4 mb-6 text-gray-300 max-w-2xl"
            variants={fadeInUp}
            transition={{ duration: 0.8, delay: 0.6 }}
          >
            Your AI partner for efficient, compliant, and comprehensive market analysis for government acquisitions.
          </motion.h2>
        </motion.div>

        {/* Input section with enhanced styling */}
        <motion.div 
          variants={fadeInUp}
          transition={{ duration: 0.8, delay: 0.8 }}
          className="w-full max-w-[760px] pb-6 sm:pb-8 md:pb-10 px-4 mt-4"
        >
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-teal-600 via-cyan-500 to-blue-600 rounded-lg blur-md opacity-75 group-hover:opacity-100 transition duration-1000 group-hover:duration-200 animate-gradient-x"></div>
            <div className="relative bg-black bg-opacity-20 backdrop-blur-sm rounded-lg ring-1 ring-gray-800/60">
              <InputArea
                promptValue={promptValue}
                setPromptValue={setPromptValue}
                handleSubmit={handleDisplayResult}
              />
            </div>
          </div>
        </motion.div>

        {/* Suggestions section with enhanced styling */}
        <motion.div 
          variants={fadeInUp}
          transition={{ duration: 0.8, delay: 1 }}
          className="flex flex-wrap items-center justify-center gap-2 xs:gap-3 md:gap-4 pb-6 sm:pb-8 md:pb-10 px-4 lg:flex-nowrap lg:justify-normal"
        >
          <AnimatePresence>
            {suggestions.map((item, index) => (
              <motion.div
                key={item.id}
                variants={fadeInUp}
                initial="hidden"
                animate="visible"
                transition={{ duration: 0.4, delay: 1 + (index * 0.1) }}
                className="flex h-[38px] sm:h-[42px] cursor-pointer items-center justify-center gap-[6px] rounded-lg 
                         border border-solid border-teal-500/30 bg-gradient-to-r from-teal-900/30 to-cyan-900/30 
                         backdrop-blur-sm px-2 sm:px-3 py-1 sm:py-2 hover:border-teal-500/60 hover:from-teal-900/40 
                         hover:to-cyan-900/40 transition-all duration-300 hover:shadow-lg hover:shadow-teal-900/20 min-w-[100px]"
                onClick={() => handleClickSuggestion(item?.name)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.98 }}
              >
                <img
                  src={item.icon}
                  alt={item.name}
                  width={18}
                  height={18}
                  className="w-[18px] sm:w-[20px] opacity-80 filter invert brightness-100"
                />
                <span className="text-xs sm:text-sm font-medium leading-[normal] text-gray-200">
                  {item.name}
                </span>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      </motion.div>
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
