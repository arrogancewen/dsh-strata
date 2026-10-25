import { createElement, useEffect, useRef } from 'react';
import { mountStrataSettings } from './settings.mjs';
import styles from './settings.css';

export const name = 'dsh-strata';
export const inject = ['slots', 'connection'];

/** Bundled as a ModuleLoader client module whose id is the package name. */
export function apply(ctx) {
  const request = async (method, params = {}) => {
    const response = await ctx.connection.rpc.call('/strata', method, params);
    if (!response.ok) {
      const error = new Error(response.error?.message ?? '记忆服务请求失败。');
      error.code = response.error?.code;
      throw error;
    }
    return response.value;
  };

  function StrataSection() {
    const container = useRef(null);
    useEffect(() => {
      const style = document.createElement('style');
      style.dataset.strataSettings = 'true';
      style.textContent = styles;
      document.head.append(style);
      let disposed = false;
      let mounted;
      const disposeMounted = () => {
        if (typeof mounted === 'function') mounted();
        else mounted?.destroy?.();
      };
      Promise.resolve(mountStrataSettings(container.current, { request, theme: 'host' })).then(value => {
        mounted = value;
        if (disposed) disposeMounted();
      }).catch(error => {
        if (!disposed && container.current) container.current.textContent = error.message ?? '无法载入记忆设置。';
      });
      return () => {
        disposed = true;
        disposeMounted();
        style.remove();
      };
    }, []);
    return createElement('div', { ref: container, style: { minWidth: 0, width: '100%' } });
  }

  ctx.slots.inject('settings.section', () => ctx.slots.register({
    name: 'settings.section',
    id: 'dsh-strata',
    order: 55,
    label: () => '记忆地层',
  }, StrataSection));
}
