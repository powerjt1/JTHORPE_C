"""MotherBridge kernel — reference package (see docs/motherbridge/specs/KERNEL-SPEC.md)."""
from . import org
from .bus import EventBus
from .config import ConfigManager
from .connections import Connection, ConnectionRegistry, default_connections
from .health import HealthMonitor
from .kernel import Kernel
from .memory import InMemoryStore, SharedMemory, SqliteStore
from .models import Agent, Decision, Event, MemoryRecord, Project, PromptDoc, Task
from .policy import PolicyEngine
from .prompts import PromptLibrary
from .registry import AgentRegistry
from .router import Router
from .scaffold import create_agent, next_number, render as render_agent
from .telemetry import Telemetry
from .validation import validate_file, validate_library, validate_text
from .versions import PromptVersionManager

__version__ = "0.1.0"

__all__ = [
    "Kernel", "PromptLibrary", "PromptVersionManager", "AgentRegistry",
    "SharedMemory", "InMemoryStore", "SqliteStore", "EventBus", "Router", "PolicyEngine",
    "Telemetry", "HealthMonitor", "ConfigManager", "org",
    "Connection", "ConnectionRegistry", "default_connections",
    "Agent", "PromptDoc", "Task", "Project",
    "Event", "MemoryRecord", "Decision",
    "create_agent", "next_number", "render_agent",
    "validate_text", "validate_file", "validate_library",
    "__version__",
]
