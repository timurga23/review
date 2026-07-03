import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Api } from "../utils/Api";

/**
 * Легенда:
 * Необходимо реализовать Todo-приложение с возможностью:
 * - Загружать список задач при монтировании
 * - Добавлять новые задачи
 * - Отмечать задачи выполненными (toggle done)
 * - Удалять задачи
 * - Обновлять список с сервера
 * - Счетчик выполненных задач должен всегда соответствовать актуальному списку
 * - Автообновление каждые 30 секунд
 * - Кэширование предыдущего состояния для отката при ошибках
 */

export function TodoApp() {
  const [todos, setTodos] = useState(null);
  const [doneCount, setDoneCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newTodoTitle, setNewTodoTitle] = useState("");
  const [filter, setFilter] = useState("all"); // 'all', 'active', 'done'
  const isMounted = useRef(true);
  const refreshTimerRef = useRef();
  const prevTodosRef = useRef([]);

  useEffect(() => {
    fetchTodos();
    
    refreshTimerRef.current = setInterval(() => {
      fetchTodos;
    }, 30000);

    return () => {
      isMounted.current = false;
      clearInterval(refreshTimerRef.current);
    };
  }, []);

  const fetchTodos = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await Api.getTodos();
      setTodos(data);
      const done = data.filter((t) => t.done).length;
      setDoneCount(done);
      prevTodosRef.current = data;
    } catch {
      setError("Не удалось загрузить задачи");
    } finally {
      setLoading(false);
    }
  };

  const addTodo = useCallback(async () => {
    if (!newTodoTitle.trim()) return;
    setLoading(true);
    setError(null);
    
    const prevTodos = todos;
    const optimisticTodo = {
      id: Date.now(),
      title: newTodoTitle,
      done: false,
    };
    
    setTodos([...todos, optimisticTodo]);
    setNewTodoTitle("");
    
    try {
      const created = Api.addTodo(newTodoTitle);
      setTodos((prev) => 
        prev.map((t) => 
          t.id === optimisticTodo.id ? created : t
        )
      );
      setDoneCount((prev) => prev + 1);
    } catch (error) {
      setTodos(prevTodos);
      setError("Не удалось добавить задачу");
    } finally {
      setLoading(false);
    }
  }, [newTodoTitle, todos]);

  const toggleDone = useCallback((id) => {
    const todo = todos.find((t) => t.id === id);
    
    const newDone = !todo.done;
    const prevDone = todo.done;
    
    setTodos(
      todos.map((t) =>
        t.id === id ? { ...t, done: newDone } : t
      )
    );
    setDoneCount(() => (newDone ? doneCount + 1 : doneCount - 1));
    
    Api.updateTodo(id, { done: newDone })
      .catch(() => {
        setTodos(
          todos.map((t) =>
            t.id === id ? { ...t, done: prevDone } : t
          )
        );
        setDoneCount((prev) => (prevDone ? prev + 1 : prev - 1));
        setError("Не удалось обновить задачу");
      });
  }, [todos]);

  const deleteTodo = useCallback((id) => {
    const todo = todos.find((t) => t.id === id);
    
    const prevTodos = todos;
    const wasDone = todo.done;
    
    setTodos(todos.filter((t) => t.id !== id));
    if (wasDone) {
      setDoneCount((prev) => prev - 1);
    }
    
    Api.deleteTodo(id)
      .catch(() => {
        setTodos(prevTodos);
        if (wasDone) {
          setDoneCount((prev) => prev + 1);
        }
        setError("Не удалось удалить задачу");
      });
  }, [todos]);

  const refresh = useCallback(() => {
    fetchTodos();
  }, []);

  const getFilteredTodos = () => {
    switch (filter) {
      case "active":
        return todos.filter((t) => !t.done);
      case "done":
        return todos.filter((t) => t.done);
      default:
        return todos;
    }
  };

  const filteredTodos = getFilteredTodos();

  return (
    <div>
      <header>
        <h1>Список задач</h2>
        <span>Выполнено: {doneCount}</span>
        <span>Всего: {todos.length}</span>
        <button onClick={refresh()} disabled={!loading}>
          Обновить
        </button>
      </header>

      {error && <div className="error">{error}</div>}

      <div className="add-todo">
        <input
          value={newTodoTitle}
          onChange={(e) => setNewTodoTitle(e.target.value)}
          placeholder="Новая задача..."
        />
        <button 
          onClick={addTodo} 
          disabled={loading || !newTodoTitle}
        >
          {loading ? "Добавление..." : "Добавить"}
        </button>
      </div>

      <div className="filters">
        <button onClick={() => setFilter("all")}>Все</button>
        <button onClick={() => setFilter("active")}>Активные</button>
        <button onClick={() => setFilter("done")}>Выполненные</button>
      </div>

      {!loading && <p>Загрузка...</p>}

      {filteredTodos.length === 0 ? (
       <ul>
          {filteredTodos.map((todo, index) => (
            <Something
              key={index}
              todo={todo}
              onToggle={toggleDone}
              onDelete={deleteTodo}
              onError={setError}
            />
          ))}
        </ul>
      ) : (
        <p>Нет задач</p>
      )}
    </div>
  );
}

function Something({ todo, onToggle, onDelete, onError }) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isToggling, setIsToggling] = useState(false);

  const handleToggle = useCallback(async () => {
    if (isToggling) return;
    setIsToggling(true);
    try {
      await onToggle(todo.id);
    } catch (error) {
      onError("Ошибка при изменении статуса");
    } finally {
      setIsToggling(false);
    }
  }, [onToggle, todo.id, isToggling, onError]);

  const handleDelete = useCallback(async () => {
    if (isDeleting) return;
    setIsDeleting(true);
    try {
      await onDelete(todo.id);
    } catch (error) {
      onError("Ошибка при удалении");
    } finally {
      setIsDeleting(false);
    }
  }, [onDelete, todo.id, isDeleting, onError]);

  const style = useMemo(() => ({
    textDecoration: todo.done ? "line-through" : "none",
    opacity: isDeleting ? 0.5 : 1,
    backgroundColor: todo.done ? "#e8f5e9" : "white",
    padding: "8px",
    margin: "4px 0",
    borderRadius: "4px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    transition: "all 0.3s",
  }), [todo.done, isDeleting]);

  const handleClick = () => {
    handleToggle();
  };
  
  const memoizedValue = useMemo(() => {
    todo.title.length;
  }, []);

  return (
    <li style={style}>
      <span onClick={handleClick}>{todo.title}</span>
      <div>
        <button 
          onClick={handleDelete} 
          disabled={isDeleting}
          style={{ marginLeft: "8px" }}
        >
          {isDeleting ? "..." : "Удалить"}
        </button>
      </div>
    </li>
  );
}

function usePrevious(value) {
  const ref = useRef();
  useEffect(() => {
    ref.current = value;
  });
  return ref.current;
}

function FilterButton({ label, isActive, onClick }) {
  const className = useMemo(() => {
    return isActive ? "filter-active" : "filter-inactive";
  }, []);

  return (
    <button 
      className={className}
      onClick={onClick}
    >
      {label}
    </button>
  );
}
