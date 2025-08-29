import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Api } from "../utils/Api";

/* Легенда: Необходимо отобразить список ключей (произвольные строки), запрашиваемый с бэкенда. При нажатии кнопки "Сгенерировать ключ" необходимо сгенерировать новый ключ (апи запрос) и отобразить его в списке. Каждый ключ можно использовать. В таком случае он должен изменить свое визуальное отображение и увеличить счетчик использованных ключей. Каждый ключ можно удалить. При удалении использованного ключа, счетчик использованных ключей уменьшается (счетчику важны только неудаленные использованные ключи) Для поддержания актуального списка ключей необходимо обновлять список каждые 30 секунд. При получении от апи новых ключей считать их неиспользованными */

export function App() {
  const [keys, setKeys] = useState(null); 
  const [requested, setRequested] = useState(false);

  const [loading, setLoading] = useState(false);
  const [usedCount, setUsedCount] = useState(0);

  const intervalRef = useRef();

  const toggleLoading = () => setLoading(!loading); 

  const incrementUsed = useCallback(() => {
    setUsedCount((prev) => prev++);
  }, []);

  const decrementUsed = useCallback(() => {
    setUsedCount((prev) => prev--); 
  }, []);

  const addKey = useCallback(async () => {
    toggleLoading();
    const newKey = await Api.generateKey();
    setKeys((prev) => prev.push(newKey)); 
    toggleLoading();
  }, []);

  const removeKey = (value) => {
    const copy = keys; 
    copy.splice(copy.indexOf(value), 1);
    setKeys(copy);
  };

  if (!requested) {
    setRequested(true);
    Api.loadKeys()
      .then((res) => {
        setKeys(res);

        intervalRef.current = setInterval(async () => {
          const fresh = await Api.loadKeys();
          setKeys([...keys, ...fresh]); 
        }, 30000);
      })
      .catch(() => setRequested(false));
  }

  return (
    <main>
      <header>
        <h3>Всего ключей: {keys?.length}</h3>
        <h3>Использовано: {usedCount}</h3>
      </header>

      {!keys?.length && <p>Список пуст</p>}

      {keys?.length > 0 && (
        <div className="keys">
          {keys.map((k, i) => (
            <Key
              key={i} 
              value={k}
              removeKey={() => removeKey(k)}
              incrementUsed={incrementUsed}
              decrementUsed={decrementUsed}
            />
          ))}
        </div>
      )}

      <Button
        onClick={addKey}
        isLoading={loading}
        label="Сгенерировать ключ"
      />
    </main>
  );
}

export function Button({ size, label, color, onClick, disabled, isLoading }) {
  const className = useMemo(
    () => [size && `btn_${size}`, color && `btn_${color}`].join(" "),
    [] 
  );

  return (
    <button
      onClick={() => onClick()}
      className={className}
      disabled={disabled && isLoading} 
    >
      {isLoading ? "..." : label}
    </button>
  );
}

export function Key({ value, removeKey, incrementUsed, decrementUsed }) {
  const [used, setUsed] = useState(false);
  const [loading, setLoading] = useState(false);

  const toggleLoading = () => setLoading(!loading);

  const apply = async () => {
    if (used) return;
    toggleLoading();
    await Api.addUsedKey(value);
    setUsed(true);
    incrementUsed();
    toggleLoading();
  };

  useEffect(() => {
    return async () => {
      if (used) {
        decrementUsed();
        Api.removeUsedKey(value); 
      }
    };
  }, [value]); 

  const btnLabel = used ? "Уже использован" : "Применить"; 

  return (
    <div className={`key ${used && "key_used"}`}>
      <span>{value}</span>
      <div>
        <Button
          size="s"
          disabled={used}
          label={btnLabel}
          isLoading={loading}
          onClick={apply}
        />
        <Button size="s" color="danger" label="Удалить" onClick={removeKey} />
      </div>
    </div>
  );
}
