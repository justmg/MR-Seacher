"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { useWebSocket } from '@/hooks/useWebSocket';
import { useResearchHistory } from '@/hooks/useResearchHistory';
import { startLanggraphResearch } from '../components/Langgraph/Langgraph';
import findDifferences from '../helpers/findDifferences';
import { Data, ChatBoxSettings, QuestionData } from '../types/data';
import { preprocessOrderedData } from '../utils/dataProcessing';
import { ResearchResults } from '../components/ResearchResults';

import Header from "@/components/Header";
import Hero from "@/components/Hero";
import Footer from "@/components/Footer";
import InputArea from "@/components/ResearchBlocks/elements/InputArea";
import HumanFeedback from "@/components/HumanFeedback";
import LoadingDots from "@/components/LoadingDots";
import ResearchSidebar from "@/components/ResearchSidebar";

export default function Home() {
  const [promptValue, setPromptValue] = useState("");
  const [showResult, setShowResult] = useState(false);
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [chatBoxSettings, setChatBoxSettings] = useState<ChatBoxSettings>({ 
    report_source: 'web', 
    report_type: 'research_report', 
    tone: 'Objective',
    domains: [],
    defaultReportType: 'research_report',
    mcp_enabled: false,
    mcp_configs: []
  });
  const [question, setQuestion] = useState("");
  const [orderedData, setOrderedData] = useState<Data[]>([]);
  const [showHumanFeedback, setShowHumanFeedback] = useState(false);
  const [questionForHuman, setQuestionForHuman] = useState<true | false>(false);
  const [allLogs, setAllLogs] = useState<any[]>([]);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const [isStopped, setIsStopped] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const mainContentRef = useRef<HTMLDivElement>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const { 
    history, 
    saveResearch, 
    getResearchById, 
    deleteResearch 
  } = useResearchHistory();

  const { socket, initializeWebSocket } = useWebSocket(
    setOrderedData,
    setAnswer,
    setLoading,
    setShowHumanFeedback,
    setQuestionForHuman
  );

  const handleFeedbackSubmit = (feedback: string | null) => {
    if (socket) {
      socket.send(JSON.stringify({ type: 'human_feedback', content: feedback }));
    }
    setShowHumanFeedback(false);
  };

  const handleChat = async (message: string) => {
    if (socket) {
      setShowResult(true);
      setQuestion(message);
      setLoading(true);
      setPromptValue("");
      setAnswer("");

      const questionData: QuestionData = { type: 'question', content: message };
      setOrderedData(prevOrder => [...prevOrder, questionData]);
      
      socket.send(`chat${JSON.stringify({ message })}`);
    }
  };

  const handleDisplayResult = async (newQuestion: string) => {
    console.log('🔍 Starting research with question:', newQuestion);
    console.log('📋 Current chatBoxSettings:', chatBoxSettings);
    
    setShowResult(true);
    setLoading(true);
    setQuestion(newQuestion);
    setPromptValue("");
    setAnswer("");
    setOrderedData((prevOrder) => [...prevOrder, { type: 'question', content: newQuestion }]);

    const storedConfig = localStorage.getItem('apiVariables');
    const apiVariables = storedConfig ? JSON.parse(storedConfig) : {};
    const langgraphHostUrl = apiVariables.LANGGRAPH_HOST_URL;

    console.log('🔧 Config check:', {
      report_type: chatBoxSettings.report_type,
      langgraphHostUrl: langgraphHostUrl,
      hasLangGraph: !!langgraphHostUrl
    });

    if (chatBoxSettings.report_type === 'multi_agents' && langgraphHostUrl) {
      console.log('🤖 Using LangGraph multi-agents path');
      try {
        let { streamResponse, host, thread_id } = await startLanggraphResearch(newQuestion, chatBoxSettings.report_source, langgraphHostUrl);
        const langsmithGuiLink = `https://smith.langchain.com/studio/thread/${thread_id}?baseUrl=${host}`;
        setOrderedData((prevOrder) => [...prevOrder, { type: 'langgraphButton', link: langsmithGuiLink }]);

        let previousChunk = null;
        for await (const chunk of streamResponse) {
          if (chunk.data.report != null && chunk.data.report != "Full report content here") {
            setOrderedData((prevOrder) => [...prevOrder, { ...chunk.data, output: chunk.data.report, type: 'report' }]);
            setLoading(false);
          } else if (previousChunk) {
            const differences = findDifferences(previousChunk, chunk);
            setOrderedData((prevOrder) => [...prevOrder, { type: 'differences', content: 'differences', output: JSON.stringify(differences) }]);
          }
          previousChunk = chunk;
        }
      } catch (error) {
        console.error('❌ LangGraph research failed:', error);
        setLoading(false);
        setOrderedData((prevOrder) => [...prevOrder, { 
          type: 'error', 
          content: 'LangGraph Error', 
          output: `Failed to start LangGraph research: ${(error as Error).message}` 
        }]);
      }
    } else {
      console.log('🌐 Using WebSocket research path');
      console.log('📡 Initializing WebSocket with:', { newQuestion, chatBoxSettings });
      
      try {
        initializeWebSocket(newQuestion, chatBoxSettings);
      } catch (error) {
        console.error('❌ WebSocket initialization failed:', error);
        setLoading(false);
        setOrderedData((prevOrder) => [...prevOrder, { 
          type: 'error', 
          content: 'WebSocket Error', 
          output: `Failed to initialize WebSocket: ${(error as Error).message}` 
        }]);
      }
    }
  };

  const reset = () => {
    // Reset UI states
    setShowResult(false);
    setPromptValue("");
    setIsStopped(false);
    
    // Clear previous research data
    setQuestion("");
    setAnswer("");
    setOrderedData([]);
    setAllLogs([]);

    // Reset feedback states
    setShowHumanFeedback(false);
    setQuestionForHuman(false);
    
    // Clean up connections
    if (socket) {
      socket.close();
    }
    setLoading(false);
  };

  const handleClickSuggestion = (value: string) => {
    setPromptValue(value);
    const element = document.getElementById('input-area');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  /**
   * Handles stopping the current research
   * - Closes WebSocket connection
   * - Stops loading state
   * - Marks research as stopped
   * - Preserves current results
   */
  const handleStopResearch = () => {
    if (socket) {
      socket.close();
    }
    setLoading(false);
    setIsStopped(true);
  };

  /**
   * Handles starting a new research
   * - Clears all previous research data and states
   * - Resets UI to initial state
   * - Closes any existing WebSocket connections
   */
  const handleStartNewResearch = () => {
    reset();
    setSidebarOpen(false);
  };

  // Save completed research to history
  useEffect(() => {
    // Only save when research is complete and not loading
    if (showResult && !loading && answer && question && orderedData.length > 0) {
      // Check if this is a new research (not loaded from history)
      const isNewResearch = !history.some(item => 
        item.question === question && item.answer === answer
      );
      
      if (isNewResearch) {
        saveResearch(question, answer, orderedData);
      }
    }
  }, [showResult, loading, answer, question, orderedData, history, saveResearch]);

  // Handle selecting a research from history
  const handleSelectResearch = (id: string) => {
    const research = getResearchById(id);
    if (research) {
      setShowResult(true);
      setQuestion(research.question);
      setPromptValue("");
      setAnswer(research.answer);
      setOrderedData(research.orderedData);
      setLoading(false);
      setSidebarOpen(false);
    }
  };

  // Toggle sidebar
  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  /**
   * Processes ordered data into logs for display
   * Updates whenever orderedData changes
   */
  useEffect(() => {
    const groupedData = preprocessOrderedData(orderedData);
    const statusReports = ["agent_generated", "starting_research", "planning_research", "error"];
    
    const newLogs = groupedData.reduce((acc: any[], data) => {
      // Process accordion blocks (grouped data)
      if (data.type === 'accordionBlock') {
        const logs = data.items.map((item: any, subIndex: any) => ({
          header: item.content,
          text: item.output,
          metadata: item.metadata,
          key: `${item.type}-${item.content}-${subIndex}`,
        }));
        return [...acc, ...logs];
      } 
      // Process status reports
      else if (statusReports.includes(data.content)) {
        return [...acc, {
          header: data.content,
          text: data.output,
          metadata: data.metadata,
          key: `${data.type}-${data.content}`,
        }];
      }
      return acc;
    }, []);
    
    setAllLogs(newLogs);
  }, [orderedData]);

  /**
   * Handles scroll events to show/hide the scroll-to-bottom button
   */
  const handleScroll = useCallback(() => {
    const scrollPosition = window.scrollY + window.innerHeight;
    const nearBottom = scrollPosition >= document.documentElement.scrollHeight - 100;
    
    // Check if the page is scrollable
    const isPageScrollable = document.documentElement.scrollHeight > window.innerHeight;
    setShowScrollButton(isPageScrollable && !nearBottom);
  }, []);

  /**
   * Sets up and cleans up event listeners for scroll and resize events
   */
  useEffect(() => {
    const mainContentElement = mainContentRef.current;
    const resizeObserver = new ResizeObserver(() => {
      handleScroll();
    });

    if (mainContentElement) {
      resizeObserver.observe(mainContentElement);
    }

    window.addEventListener('scroll', handleScroll);
    window.addEventListener('resize', handleScroll);
    
    return () => {
      if (mainContentElement) {
        resizeObserver.unobserve(mainContentElement);
      }
      resizeObserver.disconnect();
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
    };
  }, [handleScroll]);

  /**
   * Scrolls the window to the bottom of the page
   */
  const scrollToBottom = () => {
    window.scrollTo({
      top: document.documentElement.scrollHeight,
      behavior: 'smooth'
    });
  };

  return (
    <>
      <Header 
        loading={loading}
        isStopped={isStopped}
        showResult={showResult}
        onStop={handleStopResearch}
        onNewResearch={handleStartNewResearch}
        onToggleSidebar={toggleSidebar}
      />
      <ResearchSidebar
        isOpen={sidebarOpen}
        onClose={toggleSidebar}
        history={history}
        onSelectResearch={handleSelectResearch}
        onDeleteResearch={deleteResearch}
      />
      <main ref={mainContentRef} className="min-h-[100vh] pt-[120px]">
        {!showResult && (
          <Hero
            promptValue={promptValue}
            setPromptValue={setPromptValue}
            handleDisplayResult={handleDisplayResult}
          />
        )}

        {showResult && (
          <div ref={chatContainerRef} className="flex-grow overflow-y-auto">
            <ResearchResults orderedData={orderedData} />
            <div className="flex-grow" />
          </div>
        )}

        {showHumanFeedback && (
          <HumanFeedback
            questionForHuman={questionForHuman}
            websocket={socket}
            onFeedbackSubmit={handleFeedbackSubmit}
          />
        )}
      </main>

      <div className="fixed bottom-0 left-0 w-full z-10" id="input-area">
        <InputArea
          promptValue={promptValue}
          setPromptValue={setPromptValue}
          handleSubmit={handleDisplayResult}
          disabled={loading}
        />
      </div>

      {showScrollButton && (
        <button
          onClick={scrollToBottom}
          className="fixed bottom-8 right-8 flex items-center justify-center w-12 h-12 text-white bg-gradient-to-br from-teal-500 to-teal-600 rounded-full hover:from-teal-600 hover:to-teal-700 transform hover:scale-105 transition-all duration-200 shadow-lg z-50 backdrop-blur-sm border border-teal-400/20"
        >
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className="h-6 w-6" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M19 14l-7 7m0 0l-7-7m7 7V3" 
            />
          </svg>
        </button>
      )}
      <Footer />
    </>
  );
}