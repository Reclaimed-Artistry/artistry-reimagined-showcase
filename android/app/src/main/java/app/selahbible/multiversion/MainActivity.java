package app.selahbible.multiversion;

import android.annotation.SuppressLint;
import android.app.Dialog;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.Intent;
import android.graphics.Bitmap;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Message;
import android.view.ViewGroup;
import android.view.Window;
import android.webkit.CookieManager;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;

import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebChromeClient;

import java.util.Locale;

/**
 * Selah's Android shell.
 *
 * The only thing this adds to a stock Capacitor activity is pop-up support, and
 * it exists for exactly one reason: the AI reading voices are served by Puter,
 * whose first use on a device needs a one-time sign-in. Puter opens that sign-in
 * with window.open(), and the Android System WebView refuses window.open()
 * unless the app answers WebChromeClient.onCreateWindow. Without this the
 * sign-in never appears, so the neural narrator never starts.
 *
 * Each pop-up is shown in a dialog over the app. Any URL outside Puter is handed
 * to the device browser instead, which keeps ordinary target="_blank" links
 * behaving the way they did before.
 */
public class MainActivity extends BridgeActivity {

    private Dialog accountDialog;
    private boolean accountDialogShown;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Android 8+ delivers no notification at all unless the channel it is
        // posted to exists first, and FCM payloads that name a channel are
        // dropped silently when it is missing. Group notices specify
        // "selah_group", so it has to be created by the app itself.
        createNotificationChannels();

        if (bridge == null || bridge.getWebView() == null) {
            return;
        }

        WebSettings settings = bridge.getWebView().getSettings();
        // Both are required before the WebView routes window.open() to
        // onCreateWindow instead of silently returning null.
        settings.setSupportMultipleWindows(true);
        settings.setJavaScriptCanOpenWindowsAutomatically(true);

        // Extends Capacitor's own client so the file picker, permission
        // prompts, JavaScript dialogs and geolocation handling it installs keep
        // working; only pop-up creation is added.
        bridge.getWebView().setWebChromeClient(new AccountPopupChromeClient());

        try {
            CookieManager.getInstance().setAcceptCookie(true);
        } catch (Exception ignored) {
            // Cookie storage is unavailable; the pop-up still works.
        }
    }

    /**
     * Notification channels for Android 8+.
     *
     * "selah_group" is the one the push service targets. It is high importance
     * so a question or answer is visible as a heads-up rather than buried, with
     * vibration kept on. Creating it twice is harmless: the OS ignores the
     * second call and preserves whatever the reader set in system settings.
     */
    private void createNotificationChannels() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            return;
        }
        NotificationManager manager = getSystemService(NotificationManager.class);
        if (manager == null) {
            return;
        }
        NotificationChannel group = new NotificationChannel(
                "selah_group",
                "Reading group",
                NotificationManager.IMPORTANCE_HIGH);
        group.setDescription("Questions, answers, progress, and new members in your reading groups.");
        group.enableVibration(true);
        group.setShowBadge(true);
        manager.createNotificationChannel(group);

        NotificationChannel reminder = new NotificationChannel(
                "selah_reminders",
                "Reading reminders",
                NotificationManager.IMPORTANCE_DEFAULT);
        reminder.setDescription("Your daily reminder to read Scripture.");
        manager.createNotificationChannel(reminder);
    }

    /** The Puter pages that may host the AI-voice sign-in. */
    private static boolean isPuterUrl(Uri uri) {
        if (uri == null) {
            return false;
        }
        String scheme = uri.getScheme();
        if (scheme == null || !scheme.toLowerCase(Locale.US).startsWith("http")) {
            return false;
        }
        String host = uri.getHost();
        if (host == null) {
            return false;
        }
        host = host.toLowerCase(Locale.US);
        return host.equals("puter.com")
                || host.endsWith(".puter.com")
                || host.equals("puter.site")
                || host.endsWith(".puter.site");
    }

    private void showAccountDialog(Dialog dialog) {
        if (accountDialogShown || dialog == null) {
            return;
        }
        accountDialogShown = true;
        accountDialog = dialog;
        try {
            dialog.show();
        } catch (Exception ignored) {
            // The activity left the foreground before the pop-up loaded.
        }
    }

    private void dismissAccountDialog(WebView child) {
        Dialog owned = child != null && child.getTag() instanceof Dialog
                ? (Dialog) child.getTag()
                : null;
        // Only clear the tracked dialog when this child actually owns it, so a
        // probe pop-up closing cannot tear down a live sign-in window.
        if (owned != null && owned == accountDialog) {
            accountDialog = null;
            accountDialogShown = false;
            try {
                owned.dismiss();
            } catch (Exception ignored) {
                // Already gone.
            }
        }
        if (child != null) {
            try {
                child.destroy();
            } catch (Exception ignored) {
                // Already released.
            }
        }
    }

    private final class AccountPopupChromeClient extends BridgeWebChromeClient {

        AccountPopupChromeClient() {
            super(MainActivity.this.bridge);
        }

        @SuppressLint("SetJavaScriptEnabled")
        @Override
        public boolean onCreateWindow(
                WebView view,
                boolean isDialog,
                boolean isUserGesture,
                Message resultMsg) {

            if (resultMsg == null || !(resultMsg.obj instanceof WebView.WebViewTransport)) {
                return false;
            }

            final Dialog dialog = new Dialog(MainActivity.this);
            dialog.requestWindowFeature(Window.FEATURE_NO_TITLE);

            final WebView child = new WebView(MainActivity.this);
            WebSettings childSettings = child.getSettings();
            childSettings.setJavaScriptEnabled(true);
            childSettings.setDomStorageEnabled(true);
            // Nested pop-ups inside the sign-in window are not needed, and
            // leaving this off keeps a single dialog on screen at a time.
            childSettings.setSupportMultipleWindows(false);

            child.setWebViewClient(new WebViewClient() {
                private void handOff(Uri uri) {
                    dismissAccountDialog(child);
                    try {
                        startActivity(new Intent(Intent.ACTION_VIEW, uri));
                    } catch (Exception ignored) {
                        // No browser installed to take the link.
                    }
                }

                @Override
                public boolean shouldOverrideUrlLoading(WebView webView, WebResourceRequest request) {
                    Uri uri = request == null ? null : request.getUrl();
                    if (isPuterUrl(uri)) {
                        return false;
                    }
                    if (uri != null && uri.getScheme() != null
                            && uri.getScheme().toLowerCase(Locale.US).startsWith("http")) {
                        handOff(uri);
                        return true;
                    }
                    // Custom schemes (mailto:, intent:, tel:) belong to the OS.
                    if (uri != null) {
                        handOff(uri);
                        return true;
                    }
                    return false;
                }

                @Override
                public void onPageStarted(WebView webView, String url, Bitmap favicon) {
                    super.onPageStarted(webView, url, favicon);
                    // The dialog stays hidden until a Puter page actually
                    // loads, so a stray target="_blank" link never flashes it.
                    if (isPuterUrl(Uri.parse(url))) {
                        showAccountDialog(dialog);
                    }
                }
            });

            child.setWebChromeClient(new WebChromeClient() {
                @Override
                public void onCloseWindow(WebView window) {
                    // Puter closes the sign-in window once the token is back.
                    dismissAccountDialog(child);
                }
            });

            FrameLayout container = new FrameLayout(MainActivity.this);
            container.setLayoutParams(
                    new ViewGroup.LayoutParams(
                            ViewGroup.LayoutParams.MATCH_PARENT,
                            ViewGroup.LayoutParams.MATCH_PARENT));
            container.addView(
                    child,
                    new FrameLayout.LayoutParams(
                            ViewGroup.LayoutParams.MATCH_PARENT,
                            ViewGroup.LayoutParams.MATCH_PARENT));
            dialog.setContentView(container);

            // Ties the dialog to its own WebView so the first onPageStarted can
            // find it without racing any other pop-up.
            child.setTag(dialog);

            WebView.WebViewTransport transport = (WebView.WebViewTransport) resultMsg.obj;
            transport.setWebView(child);
            resultMsg.sendToTarget();

            return true;
        }
    }
}
