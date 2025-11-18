import {
  type TypedUseSelectorHook,
  useDispatch,
  useSelector,
} from "react-redux";
import type { RootState, AppDispatch } from "../configureStore";

// Use throughout your app instead of plain `useDispatch` and `useSelector`
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

//dispatch action
// import { useAppDispatch } from "../hooks/reduxHooks";
// import { increment } from "../slices/appSlice";

// const dispatch = useAppDispatch();

// dispatch(increment());

//select state
// import { useAppSelector } from "../hooks/reduxHooks";

// const value = useAppSelector((state) => state.app.value);
