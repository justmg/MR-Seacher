import warnings
from datetime import date, datetime, timezone
from typing import Callable, Dict, List, Any

from langchain.docstore.document import Document

# -----------------------------------------------------------------------------
#  Prompt Families – Base + FAR Part 10 Specialization
# -----------------------------------------------------------------------------
#  KEEP IT SIMPLE: This file strips the original GPT‑Researcher prompt code down
#  to the essentials and layers on a bespoke subclass for Federal Acquisition
#  Regulation (FAR) Part 10 market‑research work.  Everything else (Granite,
#  Deep‑research, etc.) has been omitted for clarity.  Plug this into your
#  repo, import the new family ("FARPart10"), and you are ready to generate
#  FAR‑aligned search queries and reports.
# -----------------------------------------------------------------------------

# NOTE: Ensure your local PromptFamilyEnum (utils.enum) contains a value
#       FARPart10 = "FARPart10".  If you don’t want to touch the enum you can
#       pass the plain string "FARPart10" directly into `get_prompt_family()`.


class PromptFamily:
    """Lightweight, model‑agnostic prompt helpers."""

    # ------------------------------------------------------------------
    # Construction
    # ------------------------------------------------------------------
    def __init__(self, cfg: "Config" | None = None):
        self.cfg = cfg  # cfg may be None for simple scripts

    # ------------------------------------------------------------------
    # Generic helpers (kept minimal)
    # ------------------------------------------------------------------
    @staticmethod
    def pretty_print_docs(docs: List[Document], top_n: int | None = None) -> str:
        """Compact document list → plain‑text context"""
        return "\n".join(
            f"Source: {d.metadata.get('source')}\nTitle: {d.metadata.get('title')}\nContent: {d.page_content}"
            for i, d in enumerate(docs) if top_n is None or i < top_n
        )

    # ------------------------------------------------------------------
    # ***** PUBLIC API – methods expected by the rest of GPT‑Researcher *****
    # ------------------------------------------------------------------
    @staticmethod
    def generate_search_queries_prompt(question: str, parent_query: str, report_type: str,
                                        max_iterations: int = 3, context: List[Dict[str, Any]] | None = None) -> str:
        """Default Google‑style search query generator (vanilla)."""
        task = f"{parent_query} - {question}" if parent_query else question
        dynamic_example = ", ".join([f'"query {i+1}"' for i in range(max_iterations)])
        return (
            f"Write {max_iterations} web search queries to learn about: \"{task}\".\n"
            f"Return a Python list → [{dynamic_example}] only."
        )

    @staticmethod
    def generate_report_prompt(question: str, context: str, report_source: str,
                               report_format: str = "apa", total_words: int = 1000,
                               tone: str | None = None, language: str = "english") -> str:
        """Simple markdown/APA report template."""
        tone_clause = f"Write in a {tone} tone." if tone else ""
        return (
            f"Information gathered: \"{context}\"\n---\n"
            f"Using that information, draft a {total_words}+ word report answering: \"{question}\".\n"
            f"• Use markdown + {report_format.upper()} citations.\n"
            f"• {tone_clause}\n"
            f"• Language: {language}.\n"
        )


# -----------------------------------------------------------------------------
#  FAR Part 10 Prompt Family
# -----------------------------------------------------------------------------
class FARPart10PromptFamily(PromptFamily):
    """Prompts curated for Contracting Officers & Specialists performing FAR 10 market research."""

    # Key government sources – used in examples & reasoning
    _PRIMARY_SOURCES = [
        "GSA eLibrary",
        "GSA Advantage",
        "USAspending.gov",
        "SBA Dynamic Small Business Search (DSBS)",
        "Federal Procurement Data System (FPDS)"
    ]

    # ----------------------------------------------
    # Search‑query generation (override)
    # ----------------------------------------------
    @staticmethod
    def generate_search_queries_prompt(question: str, parent_query: str, report_type: str,
                                        max_iterations: int = 3, context: List[Dict[str, Any]] | None = None) -> str:
        """Craft queries that target the *authoritative* federal data sources first."""
        task = f"{parent_query} - {question}" if parent_query else question

        gov_hint = ", ".join(FARPart10PromptFamily._PRIMARY_SOURCES)
        dynamic_example = ", ".join([f'"{s} {task}"' for s in FARPart10PromptFamily._PRIMARY_SOURCES[:max_iterations]])

        return (
            f"You are performing FAR Part 10 market research.  Generate up to {max_iterations} highly‑targeted “site:” or keyword queries that will surface contractor information from these primary systems first: {gov_hint}.  \n"
            f"Task: \"{task}\". Return ONLY a Python list, e.g. [{dynamic_example}]."
        )

    # ----------------------------------------------
    # Tool‑selection prompt (override)
    # ----------------------------------------------
    @staticmethod
    def generate_mcp_tool_selection_prompt(query: str, tools_info: List[Dict[str, Any]], max_tools: int = 3) -> str:
        """Bias selection toward FAR‑relevant tools (GSA, USAspending, etc.)."""
        # Re‑use parent logic but insert FAR criterion
        import json
        far_lang = (
            "When selecting tools, prefer those that query authoritative government acquisition data sets (GSA, FPDS, USAspending, SBA DSBS) before generic web search utilities."
        )
        return (
            f"You are a FAR Part 10 market‑research assistant.  {far_lang}\n\n"
            f"RESEARCH QUERY: \"{query}\"\n\n"
            f"AVAILABLE TOOLS:\n{json.dumps(tools_info, indent=2)}\n\n"
            f"Select EXACTLY {max_tools} tools best suited to gather competitive sourcing information.  Return the JSON object described below."
        )

    # ----------------------------------------------
    # Report prompt (override)
    # ----------------------------------------------
    @staticmethod
    def generate_report_prompt(question: str, context: str, report_source: str,
                               report_format: str = "apa", total_words: int = 800,
                               tone: str | None = "objective", language: str = "english") -> str:
        """FAR‑aligned report (sources, competition, socio‑econ, etc.)."""
        today = date.today()
        tone_clause = f"Write in a {tone} tone." if tone else ""
        source_clause = "List contract numbers & links from each cited system at the end." if report_source == "web" else ""
        return (
            f"Information collected: \n\"{context}\"\n---\n"
            f"Draft a concise FAR Part 10 market research report (≥{total_words} words) addressing: \"{question}\".\n"
            f"Required elements:\n"
            f"1. Potential sources and their socio‑economic status (e.g., Small, 8(a), HUBZone).\n"
            f"2. Contract vehicles (GSA schedules, BPAs, IDIQs) where the requirement could be placed.\n"
            f"3. Recent relevant contract awards with pricing data.\n"
            f"4. Assessment of competition & capability.\n"
            f"5. Recommendation (adequate competition? set‑aside feasible?).\n"
            f"• Use markdown + {report_format.upper()} citations.\n"
            f"• {tone_clause}  • {source_clause}\n"
            f"• Date: {today}.  Language: {language}."
        )


# -----------------------------------------------------------------------------
#  Factory helpers
# -----------------------------------------------------------------------------

# Signature for report‑generator methods the rest of the repo expects
PROMPT_GENERATOR = Callable[[str, str, str, str, str | None, int, str], str]

# Minimal mapping (only the types we kept)
report_type_mapping = {
    "ResearchReport": "generate_report_prompt",
}


def get_prompt_by_report_type(report_type: str, prompt_family: PromptFamily) -> PROMPT_GENERATOR:
    method_name = report_type_mapping.get(report_type, "generate_report_prompt")
    return getattr(prompt_family, method_name)


# ----------------------------- Prompt‑family registry ------------------------
# NOTE:  If you have a real PromptFamilyEnum, map its .value strings here.
prompt_family_mapping: Dict[str, type[PromptFamily]] = {
    "Default": PromptFamily,
    "FARPart10": FARPart10PromptFamily,
}


def get_prompt_family(name: str, config: "Config" | None = None) -> PromptFamily:
    """Retrieve the requested prompt family; fall back to Default."""
    cls = prompt_family_mapping.get(name, PromptFamily)
    if name not in prompt_family_mapping:
        warnings.warn(f"Unknown prompt family '{name}', using Default.")
    return cls(config)
