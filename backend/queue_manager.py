from typing import Dict, List, Optional, Any
from datetime import datetime
from collections import deque
from abc import ABC, abstractmethod

# ---------------------------------------------------------
# Port: The Seam defining Queue operations
# ---------------------------------------------------------
class QueueAdapter(ABC):
    @abstractmethod
    def add_customer(self, email: str, caller_type: str) -> int:
        """Add customer to the queue and return new position."""
        pass

    @abstractmethod
    def get_customer_position(self, email: str) -> Optional[int]:
        """Get customer's position in the queue (1-indexed)."""
        pass

    @abstractmethod
    def peek_next_customer(self) -> Optional[Dict[str, Any]]:
        """Return the next customer in queue without removing them."""
        pass

    @abstractmethod
    def pop_next_customer(self) -> Optional[Dict[str, Any]]:
        """Remove and return the next customer in the queue."""
        pass

    @abstractmethod
    def get_queue_length(self) -> int:
        """Return total count of waiting customers."""
        pass

    @abstractmethod
    def get_available_agents_count(self) -> int:
        """Return count of online agents that are available."""
        pass

    @abstractmethod
    def set_agent_status(self, agent_id: str, status: str, current_customer: Optional[str] = None) -> None:
        """Update status and current customer for an agent."""
        pass

    @abstractmethod
    def get_agent_status(self, agent_id: str) -> Optional[Dict[str, Any]]:
        """Get current status info for an agent."""
        pass


# ---------------------------------------------------------
# Adapter 1: In-Memory Implementation (Active Dev/Test)
# ---------------------------------------------------------
class InMemoryQueueAdapter(QueueAdapter):
    def __init__(self):
        self._customer_queue = deque()
        self._agent_status = {}
        # Prepopulate demo agents
        self._initialize_default_agents()

    def _initialize_default_agents(self):
        self._agent_status["agent_a"] = {
            "status": "offline",
            "current_customer": None,
            "last_updated": datetime.now()
        }
        self._agent_status["agent_b"] = {
            "status": "offline",
            "current_customer": None,
            "last_updated": datetime.now()
        }

    def add_customer(self, email: str, caller_type: str) -> int:
        # Check if already in queue to prevent duplicates
        pos = self.get_customer_position(email)
        if pos is not None:
            return pos

        entry = {
            "email": email,
            "caller_type": caller_type,
            "timestamp": datetime.now(),
            "status": "waiting"
        }
        self._customer_queue.append(entry)
        return len(self._customer_queue)

    def get_customer_position(self, email: str) -> Optional[int]:
        for i, customer in enumerate(self._customer_queue):
            if customer["email"] == email:
                return i + 1
        return None

    def peek_next_customer(self) -> Optional[Dict[str, Any]]:
        if self._customer_queue:
            return self._customer_queue[0]
        return None

    def pop_next_customer(self) -> Optional[Dict[str, Any]]:
        if self._customer_queue:
            return self._customer_queue.popleft()
        return None

    def get_queue_length(self) -> int:
        return len(self._customer_queue)

    def get_available_agents_count(self) -> int:
        return sum(1 for status in self._agent_status.values() if status.get("status") == "available")

    def set_agent_status(self, agent_id: str, status: str, current_customer: Optional[str] = None) -> None:
        self._agent_status[agent_id] = {
            "status": status,
            "current_customer": current_customer,
            "last_updated": datetime.now()
        }

    def get_agent_status(self, agent_id: str) -> Optional[Dict[str, Any]]:
        if agent_id not in self._agent_status:
            self._agent_status[agent_id] = {
                "status": "offline",
                "current_customer": None,
                "last_updated": datetime.now()
            }
        return self._agent_status.get(agent_id)


# ---------------------------------------------------------
# Adapter 2: Database/Redis Implementation (Hypothetical Seam Proof)
# ---------------------------------------------------------
class DatabaseQueueAdapter(QueueAdapter):
    """
    Hypothetical adapter connecting to a persistent PostgreSQL/Redis store.
    This demonstrates that our QueueManager can swap database schemas without affecting FastAPI routes.
    """
    def __init__(self, db_connection_url: str):
        self.connection_url = db_connection_url

    def add_customer(self, email: str, caller_type: str) -> int:
        raise NotImplementedError("DatabaseQueueAdapter is a hypothetical seam. Use InMemoryQueueAdapter.")

    def get_customer_position(self, email: str) -> Optional[int]:
        raise NotImplementedError("DatabaseQueueAdapter is a hypothetical seam. Use InMemoryQueueAdapter.")

    def peek_next_customer(self) -> Optional[Dict[str, Any]]:
        raise NotImplementedError("DatabaseQueueAdapter is a hypothetical seam. Use InMemoryQueueAdapter.")

    def pop_next_customer(self) -> Optional[Dict[str, Any]]:
        raise NotImplementedError("DatabaseQueueAdapter is a hypothetical seam. Use InMemoryQueueAdapter.")

    def get_queue_length(self) -> int:
        raise NotImplementedError("DatabaseQueueAdapter is a hypothetical seam. Use InMemoryQueueAdapter.")

    def get_available_agents_count(self) -> int:
        raise NotImplementedError("DatabaseQueueAdapter is a hypothetical seam. Use InMemoryQueueAdapter.")

    def set_agent_status(self, agent_id: str, status: str, current_customer: Optional[str] = None) -> None:
        raise NotImplementedError("DatabaseQueueAdapter is a hypothetical seam. Use InMemoryQueueAdapter.")

    def get_agent_status(self, agent_id: str) -> Optional[Dict[str, Any]]:
        raise NotImplementedError("DatabaseQueueAdapter is a hypothetical seam. Use InMemoryQueueAdapter.")


# ---------------------------------------------------------
# Deep Module: Coordinates Queue & Assignment Logic
# ---------------------------------------------------------
class QueueManager:
    def __init__(self, adapter: QueueAdapter):
        self._adapter = adapter

    def add_customer(self, email: str, caller_type: str) -> Dict[str, Any]:
        """Enqueues a customer and returns their position status."""
        position = self._adapter.add_customer(email, caller_type)
        return self._build_status_response(position)

    def get_customer_status(self, email: str) -> Optional[Dict[str, Any]]:
        """Get queue metrics for a specific customer."""
        position = self._adapter.get_customer_position(email)
        if position is None:
            return None
        return self._build_status_response(position)

    def set_agent_status(self, agent_id: str, status: str, current_customer: Optional[str] = None) -> None:
        """Update availability status of an agent."""
        self._adapter.set_agent_status(agent_id, status, current_customer)

    def get_agent_status(self, agent_id: str) -> Optional[Dict[str, Any]]:
        """Retrieve current status of an agent."""
        return self._adapter.get_agent_status(agent_id)

    def try_assign_customer(self, agent_id: str) -> Optional[Dict[str, Any]]:
        """
        Check if an agent is available and there's a waiting customer.
        If yes, pops the customer, sets agent status to busy, and returns the customer.
        """
        status_info = self._adapter.get_agent_status(agent_id)
        if not status_info or status_info.get("status") != "available":
            return None

        customer = self._adapter.pop_next_customer()
        if customer:
            self._adapter.set_agent_status(agent_id, "busy", customer["email"])
            return customer
        return None

    def try_assign_agent_to_customer(self, email: str, agent_id: str = "agent_a") -> Optional[Dict[str, Any]]:
        """
        If a customer is first in queue and the specified agent is available,
        assign them and set the agent status to busy.
        """
        position = self._adapter.get_customer_position(email)
        if position == 1:
            status_info = self._adapter.get_agent_status(agent_id)
            if status_info and status_info.get("status") == "available":
                peek_customer = self._adapter.peek_next_customer()
                if peek_customer and peek_customer["email"] == email:
                    customer = self._adapter.pop_next_customer()
                    if customer:
                        self._adapter.set_agent_status(agent_id, "busy", customer["email"])
                        return customer
        return None

    def calculate_wait_time(self, position: int) -> int:
        """Calculate wait time estimation based on queue position."""
        agents = self._adapter.get_available_agents_count()
        if agents == 0:
            return 300  # Default 5 minutes
        return (position * 300) // max(agents, 1)

    def _build_status_response(self, position: int) -> Dict[str, Any]:
        """Utility to format customer queue state."""
        return {
            "position": position,
            "estimated_wait_time": self.calculate_wait_time(position),
            "total_waiting": self._adapter.get_queue_length(),
            "agents_available": self._adapter.get_available_agents_count()
        }


# Global instantiation with the primary InMemory adapter
queue_manager = QueueManager(InMemoryQueueAdapter())
