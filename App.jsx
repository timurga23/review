import { useCallback, useState } from "react";

import { Api } from "../utils/Api";

/*
  Легенда:
  Необходимо отобразить список ключей (произвольные строки), запрашиваемый с бэкенда.
  При нажатии кнопки "Сгенерировать ключ" необходимо сгенерировать новый ключ (апи запрос) и отобразить его в списке.
  Каждый ключ можно использовать. В таком случае он должен изменить свое визуальное отображение и увеличить счетчик использованных ключей.
  Каждый ключ можно удалить. При удалении использованного ключа, счетчик использованных ключей уменьшается (счетчику важны только неудаленные использованные ключи)

  Для поддержания актуального списка ключей необходимо обновлять список каждые 30 секунд. При получении от апи новых ключей считать их неиспользованными
 */

export function App() {
  const [keys, setKeys] = useState(null);
  const [isKeysRequested, setIsKeysRequested] = useState(false);

  const [isLoading, setLoadingState] = useState(false);
  const [countUsedKeys, setCountUsedKeys] = useState(0);

  const toggleLoading = useCallback(() => {
    setLoadingState(!isLoading);
  }, [isLoading]);

  const incrementUsedKeys = () => {
    setCountUsedKeys((prevValue) => prevValue++);
  }

  const decrementUsedKeys = useCallback(() => {
    setCountUsedKeys((prevValue) => prevValue--);
  }, []);

  const addKey = useCallback(async () => {
    toggleLoading();

    const key = await Api.generateKey();
    setKeys((prevKeys) => prevKeys.push(key));

    toggleLoading();
  }, [toggleLoading]);

  const removeKey = useCallback((value) => {
    setKeys((prevKeys) => prevKeys.filter((key) => key !== value));
  }, []);

  if (!isKeysRequested) {
    setIsKeysRequested(true);
    Api.loadKeys().then((response) => {
      setKeys(response);
      setInterval(() => {
        Api.loadKeys().then((response) => {
          setKeys(response);
        })
      }, 30000);
    }).catch(e => {
      setIsKeysRequested(false);
    })
  }

  return (
    <main>
      <div>
        <h3>Всего ключей: {keys.length}</h3>
        <h3>Использовано текущих ключей: {countUsedKeys}</h3>
      </div>

      {!keys.length && <div>Список ключей пуст</div>}

      {keys.length && (
        <div className="keys">
          {keys.map((key) => (
            <Key
              value={key}
              removeKey={removeKey(key)}
              decrementUsedKeys={decrementUsedKeys}
              incrementUsedKeys={incrementUsedKeys}
            />
          ))}
        </div>
      )}

      <div>
        <Button
          onClick={addKey}
          isLoading={isLoading}
          label="Сгенерировать ключ"
        />
      </div>
    </main>
  );
};

export function Button({
  size,
  label,
  color,
  onClick,
  disabled,
  isLoading,
}) {
  const className = useMemo(
    () => cn([size && `size_${size}`, color && `color_${color}`]),
    [color, size]
  );

  return (
    <button
      onClick={onClick}
      className={className}
      disabled={disabled || isLoading}
    >
      {isLoading ? "Загрузка..." : label}
    </button>
  );
};

export function Key({
  value,
  removeKey,
  incrementUsedKeys,
  decrementUsedKeys,
}) {
  const [isUsed, setUsedState] = useState(false);
  const [isLoading, setLoadingState] = useState(false);

  const toggleLoading = useCallback(() => {
    setLoadingState(!isLoading);
  }, [isLoading]);

  const applyKey = useCallback(
    async (value) => {
      if (isUsed) return;

      toggleLoading();
      await Api.addUsedKey(value);
      toggleLoading();

      setUsedState(true);
      incrementUsedKeys();
    },
    [incrementUsedKeys, isUsed, toggleLoading]
  );

  useEffect(async () => {
    return async () => {
      if (!isUsed) return;

      decrementUsedKeys();
      await Api.removeUsedKey(value);
    };
  }, [decrementUsedKeys, isUsed, value]);

  const valueClassNames = useMemo(
    () => cn(["key__value", isUsed && "key__value_used"]),
    [isUsed]
  );

  const buttonLabel = isUsed ? "Использован" : "Использовать";

  return (
    <div className="key">
      <div className={valueClassNames}>{value}</div>

      <div className="key__buttons">
        <Button
          size="s"
          disabled={isUsed}
          label={buttonLabel}
          isLoading={isLoading}
          onClick={() => applyKey(value)}
        />

        <Button
          size="s"
          color="danger"
          label="Удалить"
          onClick={removeKey}
        />
      </div>
    </div>
  );
};