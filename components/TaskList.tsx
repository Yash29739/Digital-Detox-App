// components/TodoList.tsx
"use client";
import { useState, useEffect } from "react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Checkbox from "@mui/material/Checkbox";
import IconButton from "@mui/material/IconButton";
import DeleteIcon from "@mui/icons-material/Delete";
import StarIcon from "@mui/icons-material/Star";
import { Table, Thead, Tbody, Tr, Th, Td } from "react-super-responsive-table";
import "react-super-responsive-table/dist/SuperResponsiveTableStyle.css";
import LoadingCursor from "@/app/loading";
import { useRouter } from "next/navigation";
import { useLogin } from "@/context/LoginContext";

interface Todo {
  task_name: string;
  status: boolean;
  priority: boolean;
  due_date: string;
}

const TodoList = () => {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [inputValue, setInputValue] = useState<string>("");
  const [dueDate, setDueDate] = useState("");
  const [loading, setloading] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);
  const [editingTask, setEditingTask] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState<string>("");
  const [editingDate, setEditingDate] = useState<string>("");
  const { isLoggedIn } = useLogin();
  const router = useRouter();

  const fetchTodos = async () => {
    setloading(true);
    try {
      if (!isLoggedIn) {
        router.push("/login");
      }
      const response = await fetch("https://digital-detox-y73b.onrender.com/toDoList", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      const data = await response.json();

      if (response.ok) {
        const sortedTodos = (Array.isArray(data.tasks) ? data.tasks : [])
          .map((task: Todo) => ({
            ...task,
            due_date: task.due_date.split("T")[0],
          }))
          .sort((a: any, b: any) => {
            if (a.status !== b.status) return a.status ? 1 : -1;
            return b.priority ? -1 : 1;
          });
        setTodos(sortedTodos);
      } else {
        console.log("Failed to fetch tasks.");
      }
    } catch (error) {
      console.log("An error occurred while fetching tasks.");
    } finally {
      setloading(false);
    }
  };

  useEffect(() => {
    fetchTodos();
  }, []);

  const updateTodos = (updatedTodos: Todo[]) => {
    setTodos([...updatedTodos].sort((a, b) => {
      if (a.status !== b.status) return a.status ? 1 : -1;
      return b.priority ? 1 : -1;
    }));
  };

  const addTodo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || !dueDate) {
      toast.info("Please fill in all fields.");
      return;
    }
    const currentDate = new Date();
    const selectedDate = new Date(dueDate);
    if (selectedDate < currentDate) {
      toast.error("Due date cannot be in the past.");
      return;
    }

    const newTodo: Todo = {
      task_name: inputValue.trim(),
      status: false,
      priority: false,
      due_date: dueDate || "", // Allow due_date to be an empty string.
    };


    updateTodos([...todos, newTodo]);

    // Api to store to do list
    try {
      const response = await fetch("https://digital-detox-y73b.onrender.com/toDoList", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newTodo),
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to add task.");
      }

      // Clearing the form
      setInputValue("");
      setDueDate("");

    } catch (error) {
      toast.error("An error occurred while adding the task.");
    }
  };

  const toggleTodo = async (taskName: string) => {
    const updatedTodos = todos.map((todo) =>
      todo.task_name === taskName ? { ...todo, status: !todo.status } : todo
    );
    updateTodos(updatedTodos);

    try {
      await fetch("https://digital-detox-y73b.onrender.com/toDoList", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          task_name: taskName,
          status: updatedTodos.find((todo) => todo.task_name === taskName)?.status,
        }),
        credentials: "include",
      });
    } catch (error) {
      toast.error("An error occurred while toggling task status.");
    }
  };

  const deleteTodo = async (taskName: string) => {
    const updatedTodos = todos.filter((todo) => todo.task_name !== taskName);
    updateTodos(updatedTodos);

    try {
      const response = await fetch("https://digital-detox-y73b.onrender.com/toDoList", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task_name: taskName }),
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to delete task.");
      }
    } catch (error) {
      toast.error("An error occurred while deleting the task.");
    }
  };

  const updatePriority = async (taskName: string) => {
    const updatedTodos = todos.map((todo) =>
      todo.task_name === taskName ? { ...todo, priority: !todo.priority } : todo
    );
    updateTodos(updatedTodos);

    try {
      await fetch("https://digital-detox-y73b.onrender.com/toDoList", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          task_name: taskName,
          priority: updatedTodos.find((todo) => todo.task_name === taskName)?.priority,
        }),
        credentials: "include",
      });
    } catch (error) {
      toast.error("An error occurred while updating priority.");
    }
  };

  const editTask = async (oldTaskName: string, newTaskName: string, newDueDate: string) => {
    const updatedTodos = todos.map((todo) =>
      todo.task_name === oldTaskName
        ? { ...todo, task_name: newTaskName, due_date: newDueDate }
        : todo
    );
    updateTodos(updatedTodos);

    try {
      await fetch("https://digital-detox-y73b.onrender.com/toDoList/update", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          old_task_name: oldTaskName,
          new_task_name: newTaskName,
          new_due_date: newDueDate,
        }),
        credentials: "include",
      });
    } catch (error) {
      toast.error("An error occurred while editing the task.");
    }
  };

  const renderTasks = (taskList: Todo[], showActions = true) =>
    taskList.map((todo) => {
      const isOverdue = new Date(todo.due_date) < new Date() && !todo.status;
  
      return (
        <Tr key={todo.task_name} className="border border-blue-300">
          {/* Task Name */}
          <Td className="border border-blue-300 px-4 py-2">
            {editingTask === todo.task_name ? (
              <input
                type="text"
                value={editingValue}
                onChange={(e) => setEditingValue(e.target.value)}
                onBlur={(e) => {
                  // Ensure blur doesn't immediately close edit mode
                  if (!e.relatedTarget || e.relatedTarget.tagName !== "INPUT") {
                    editTask(todo.task_name, editingValue, editingDate || todo.due_date);
                    setEditingTask(null);
                  }
                }}
                autoFocus
              />
            ) : (
              <div
                onDoubleClick={() => {
                  setEditingTask(todo.task_name);
                  setEditingValue(todo.task_name);
                  setEditingDate(todo.due_date);
                }}
              >
                <Checkbox
                  checked={todo.status}
                  onChange={() => toggleTodo(todo.task_name)}
                  color="primary"
                />
                {todo.task_name}
              </div>
            )}
          </Td>
  
          {/* Due Date */}
          <Td
            className={`border border-blue-300 px-4 py-2 ${
              isOverdue ? "text-red-500 font-semibold" : ""
            }`}
          >
            {editingTask === todo.task_name ? (
              <div>
                <input
                  type="date"
                  value={editingDate}
                  onChange={(e) => setEditingDate(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      editTask(todo.task_name, editingValue, editingDate);
                      setEditingTask(null);
                    }
                  }}
                  onBlur={(e) => {
                    // Prevent premature blur if Save button or date input is clicked
                    if (!e.relatedTarget || e.relatedTarget.tagName !== "BUTTON") {
                      editTask(todo.task_name, editingValue, editingDate);
                      setEditingTask(null);
                    }
                  }}
                />
                <button
                  onClick={() => {
                    editTask(todo.task_name, editingValue, editingDate);
                    setEditingTask(null);
                  }}
                  className="ml-2 px-2 py-1 text-sm text-white bg-blue-600 rounded"
                >
                  Save
                </button>
              </div>
            ) : (
              <div
                onDoubleClick={() => {
                  setEditingTask(todo.task_name);
                  setEditingValue(todo.task_name);
                  setEditingDate(todo.due_date);
                }}
              >
                {todo.due_date || "No due date"}
              </div>
            )}
          </Td>
  
          {/* Priority */}
          <Td align="center">
            <IconButton onClick={() => updatePriority(todo.task_name)}>
              <StarIcon style={{ color: todo.priority ? "#1e90ff" : "#b3b3b3" }} />
            </IconButton>
          </Td>
  
          {/* Actions */}
          {showActions && (
            <Td align="center" className="border border-blue-300">
              <IconButton onClick={() => deleteTodo(todo.task_name)} color="error">
                <DeleteIcon />
              </IconButton>
            </Td>
          )}
        </Tr>
      );
    });
  


  return (
    <div className="max-w-full h-full mx-5 md:mx-10 mt-32 p-10 border rounded-lg shadow-lg bg-blue-50">
      <h1 className="text-4xl font-bold text-center mb-10 text-blue-600">Todo List</h1>
      <form onSubmit={addTodo} className="flex w-full sm:flex-row flex-col md:space-x-5 justify-center items-center mb-5">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Task Name"
          className="px-4 py-2 border w-full border-blue-300 rounded-lg mb-2 sm:mb-0"
          required
        />
        <input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          className="px-4 py-2 border w-full border-blue-300 rounded-lg mb-2 sm:mb-0"
          required
        />
        <button
          type="submit"
          className="px-4 py-2 rounded-lg w-full bg-blue-600 text-white hover:bg-blue-700 focus:outline-none"
        >
          Add Task
        </button>
      </form>
      <Table className="w-full border-collapse border border-blue-300 shadow-lg">
        <Thead>
          <Tr className="bg-blue-100 border border-blue-300">
            <Th className="px-4 py-2">Task</Th>
            <Th className="px-4 py-2">Due Date</Th>
            <Th className="px-4 py-2">Priority</Th>
            <Th className="px-4 py-2">Action</Th>
          </Tr>
        </Thead>
        <Tbody>{renderTasks(todos.filter((todo) => !todo.status))}</Tbody>
      </Table>
      <details open={showCompleted}>
        <summary
          onClick={() => setShowCompleted(!showCompleted)}
          className="mt-5 px-4 py-2 rounded-md bg-blue-600 text-white text-center cursor-pointer"
        >
          Completed Tasks ({todos.filter((todo) => todo.status).length})
        </summary>
        <Table className="w-full border-collapse border border-blue-300 shadow-lg">
          <Thead>
            <Tr className="bg-blue-100 border border-blue-300">
              <Th className="px-4 py-2">Task</Th>
              <Th className="px-4 py-2">Due Date</Th>
              <Th className="px-4 py-2">Priority</Th>
            </Tr>
          </Thead>
          <Tbody>{renderTasks(todos.filter((todo) => todo.status), false)}</Tbody>
        </Table>
      </details>
      {loading && (
  <div className="flex justify-center items-center w-full h-full">
    <LoadingCursor w={250} h={250} />
  </div>
)}

      <ToastContainer />
    </div>
  );
};

export default TodoList;