export default function BackofficeHead() {
  return (
    <>
      {/* PWA Meta Tags */}
      <meta name="application-name" content="Epictete Backoffice" />
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      <meta name="apple-mobile-web-app-title" content="Backoffice" />

      {/* Apple Touch Icons */}
      <link rel="apple-touch-icon" href="/apple-touch-icon-backoffice.png" />
      <link rel="apple-touch-icon" sizes="152x152" href="/backoffice-icon-192.png" />
      <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon-backoffice.png" />
      <link rel="apple-touch-icon" sizes="167x167" href="/backoffice-icon-192.png" />

      {/* Splash Screens for iOS */}
      <meta name="apple-mobile-web-app-capable" content="yes" />

      {/* Microsoft Tiles */}
      <meta name="msapplication-TileColor" content="#606338" />
      <meta name="msapplication-TileImage" content="/backoffice-icon-192.png" />
      <meta name="msapplication-config" content="none" />

      {/* Prevent phone number detection */}
      <meta name="format-detection" content="telephone=no" />

      {/* Disable automatic iOS scaling */}
      <meta name="HandheldFriendly" content="true" />
    </>
  );
}
