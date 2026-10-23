"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

import { ANNOUNCE_LOADING_AFTER_MS, LOADING_ANNOUNCEMENT } from "./loading-announcer.definition";

type Register = () => () => void;

const RegisterContext = createContext<Register | undefined>(undefined);

/** {@link LoadingAnnouncerProvider} の props。 */
export type LoadingAnnouncerProviderProps = {
  /** 読み込みを告げる範囲。 */
  readonly children: ReactNode;
};

/**
 * 画面のどこかが読み込み中であることを、支援技術へ 1 件だけ告げる。
 *
 * @remarks
 * **告げる領域は空のまま先に置きます。** live region は、中身が入る前から在るものしか確実には
 * 読まれません。そのためアプリ全体に 1 つだけ置き、文言だけを出し入れします。
 *
 * 読み込みが {@link ANNOUNCE_LOADING_AFTER_MS} を超えたときだけ始まりを告げ、告げた読み込みに
 * 限って終わりも告げます。文言を消すだけでは読まれないためです。
 *
 * @param props - 読み込みを告げる範囲。
 * @see Storybook `Feedback/LoadingAnnouncer`
 */
export function LoadingAnnouncerProvider({ children }: LoadingAnnouncerProviderProps) {
  const [message, setMessage] = useState("");
  const pending = useRef(0);
  const announced = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const register = useCallback(() => {
    pending.current += 1;

    if (pending.current === 1) {
      timer.current = setTimeout(() => {
        announced.current = true;
        setMessage(LOADING_ANNOUNCEMENT.LOADING);
      }, ANNOUNCE_LOADING_AFTER_MS);
    }

    return () => {
      pending.current -= 1;

      if (pending.current > 0) {
        return;
      }

      clearTimeout(timer.current);

      if (announced.current) {
        announced.current = false;
        setMessage(LOADING_ANNOUNCEMENT.LOADED);
      }
    };
  }, []);

  useEffect(() => () => clearTimeout(timer.current), []);

  return (
    <RegisterContext.Provider value={register}>
      {children}
      <p className="sr-only" role="status">
        {message}
      </p>
    </RegisterContext.Provider>
  );
}

/**
 * 置かれている間、読み込み中として数えられる。
 *
 * @remarks
 * `Suspense` の待機表示の中に 1 つ置きます。何も描かないので、読み上げから外した待機表示の内側に
 * 置いても構いません。{@link LoadingAnnouncerProvider} の外では何もしません。
 */
export function LoadingAnnouncement() {
  const register = useContext(RegisterContext);

  useEffect(() => register?.(), [register]);

  return null;
}
