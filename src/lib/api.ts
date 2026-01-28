import ky, { Options } from "ky";
import { fetch as tauriFetch } from "@tauri-apps/plugin-http";

interface ApiOptions extends Options {
  /**
   * 是否使用 Rust 后端进行请求（解决跨域问题）
   * If true, uses the Tauri HTTP plugin which bypasses CORS.
   */
  useBackend?: boolean;
}

/**
 * 统一的 API 请求模块
 */
export const api = {
  /**
   * 发起 GET 请求
   */
  get: (url: string, options: ApiOptions = {}) => {
    const { useBackend, ...kyOptions } = options;
    return ky.get(url, {
      ...kyOptions,
      fetch: useBackend ? tauriFetch : undefined,
    });
  },

  /**
   * 发起 POST 请求
   */
  post: (url: string, options: ApiOptions = {}) => {
    const { useBackend, ...kyOptions } = options;
    return ky.post(url, {
      ...kyOptions,
      fetch: useBackend ? tauriFetch : undefined,
    });
  },

  /**
   * 通用请求方法，可用于流式处理等高级场景
   * 返回 ky 的 ResponsePromise
   */
  request: (url: string, options: ApiOptions = {}) => {
    const { useBackend, ...kyOptions } = options;
    return ky(url, {
      ...kyOptions,
      fetch: useBackend ? tauriFetch : undefined,
    });
  },
};
