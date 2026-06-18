import type { Metadata } from 'next';
import './globals.css';
import VersionLogger from './VersionLogger';
import { ToastProvider } from '@/components/ui/Toast';
import { ThemeProvider } from '@/components/ui/ThemeProvider';
import { fontVariables } from '@/lib/fonts';

export const metadata: Metadata = {
  title: 'YouTube Dashboard — Velox',
  description: 'Gestione gruppi YouTube e video del gruppo selezionato.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`dark ${fontVariables}`} suppressHydrationWarning>
      <head>
        <script
          suppressHydrationWarning
          dangerouslySetInnerHTML={{
            __html: `(function(){
              var _warn = console.warn;
              var _error = console.error;
              function shouldIgnore(msg){
                if (typeof msg !== 'string') return false;
                return msg.indexOf('data-darkreader-proxy-injected') !== -1 ||
                       msg.indexOf('data-darkreader-inline-stroke') !== -1 ||
                       msg.indexOf('Extra attributes from the server') !== -1 ||
                       msg.indexOf('React DevTools') !== -1;
              }
              console.warn = function(msg){ if (shouldIgnore(msg)) return; return _warn.apply(console, arguments); };
              console.error = function(msg){ if (shouldIgnore(msg)) return; return _error.apply(console, arguments); };
            })();`,
          }}
        />
      </head>
      <body className="font-sans" suppressHydrationWarning>
        <ThemeProvider>
          <ToastProvider>
            <VersionLogger />
            {children}
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
