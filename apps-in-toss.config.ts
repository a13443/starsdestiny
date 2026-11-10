import { defineConfig } from '@apps-in-toss/web-framework/config';

export default defineConfig({
  // 앱인토스 콘솔에 등록된 appName이에요(콘솔에서 잠겨 있음). src/app/brand.ts의 APP_NAME과 같아야 하고, brand.test.ts가 검사해요.
  appName: 'starsdestiny',
  brand: { primaryColor: '#3182F6' },
  permissions: [],
  navigationBar: { withBackButton: true, withHomeButton: false, withTitle: true, theme: 'light' },
  webView: {},
  webBundleDir: 'dist',
});
