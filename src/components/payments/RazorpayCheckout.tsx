import { X } from 'lucide-react-native';
import { useMemo, useRef } from 'react';
import { ActivityIndicator, Linking, Modal, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

import { checkoutOptions, RAZORPAY_SCRIPT, type RazorpayOrder, type RazorpayResult } from '@/lib/razorpay';
import { colors } from '@/theme/colors';

export interface RazorpayCheckoutProps {
  /** Opens checkout when set; pass null to keep it closed. */
  order: RazorpayOrder | null;
  description: string;
  onResult: (result: RazorpayResult) => void;
}

/** Embeds JSON in an inline <script> without letting "</script>" break out of it. */
const toScriptJson = (value: unknown) => JSON.stringify(value).replace(/</g, '\\u003c');

function checkoutHtml(order: RazorpayOrder, description: string) {
  return `<!doctype html><html><head>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
<style>html,body{margin:0;height:100%;background:#fff;font-family:-apple-system,system-ui,sans-serif}
#msg{display:flex;height:100%;align-items:center;justify-content:center;color:#64748B;font-size:14px}</style>
<script src="${RAZORPAY_SCRIPT}"></script></head>
<body><div id="msg">Opening secure checkout…</div><script>
  function send(m){ window.ReactNativeWebView.postMessage(JSON.stringify(m)); }
  try {
    var options = ${toScriptJson(checkoutOptions(order, description))};
    options.handler = function (r) {
      send({ type: 'success', paymentId: r.razorpay_payment_id, orderId: r.razorpay_order_id, signature: r.razorpay_signature });
    };
    options.modal = { ondismiss: function () { send({ type: 'dismissed' }); }, confirm_close: true };
    var rzp = new Razorpay(options);
    rzp.on('payment.failed', function (r) {
      send({ type: 'failed', message: (r && r.error && r.error.description) || 'Payment failed.' });
    });
    rzp.open();
  } catch (e) {
    send({ type: 'failed', message: 'Could not load the payment page. Check your connection and try again.' });
  }
</script></body></html>`;
}

/**
 * Native Razorpay Checkout: Razorpay's own checkout.js inside a WebView. Card/UPI/netbanking all
 * run on Razorpay's page; UPI intent links (upi://, tez://, phonepe://…) are handed to the
 * installed apps. No card data ever touches this app.
 */
export function RazorpayCheckout({ order, description, onResult }: RazorpayCheckoutProps) {
  const insets = useSafeAreaInsets();
  const settled = useRef(false);
  const html = useMemo(() => (order ? checkoutHtml(order, description) : ''), [order, description]);

  const finish = (result: RazorpayResult) => {
    if (settled.current) return;
    settled.current = true;
    onResult(result);
  };

  const onMessage = (event: WebViewMessageEvent) => {
    try {
      const m = JSON.parse(event.nativeEvent.data) as { type: string; [k: string]: string };
      if (m.type === 'success') finish({ status: 'success', paymentId: m.paymentId, orderId: m.orderId, signature: m.signature });
      else if (m.type === 'failed') finish({ status: 'failed', message: m.message });
      else if (m.type === 'dismissed') finish({ status: 'dismissed' });
    } catch {
      // Ignore messages that are not ours.
    }
  };

  return (
    <Modal
      visible={!!order}
      animationType="slide"
      presentationStyle="fullScreen"
      onShow={() => {
        settled.current = false;
      }}
      onRequestClose={() => finish({ status: 'dismissed' })}
    >
      <View className="flex-1 bg-white" style={{ paddingTop: insets.top }}>
        <View className="h-12 flex-row items-center justify-between border-b border-line px-4">
          <Text className="text-base font-semibold text-ink">Secure payment</Text>
          <Pressable
            onPress={() => finish({ status: 'dismissed' })}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Close payment"
          >
            <X size={22} color={colors.ink} />
          </Pressable>
        </View>
        {order ? (
          <WebView
            source={{ html, baseUrl: 'https://bondsadda.com' }}
            originWhitelist={['*']}
            onMessage={onMessage}
            javaScriptEnabled
            domStorageEnabled
            setSupportMultipleWindows={false}
            startInLoadingState
            renderLoading={() => (
              <View className="absolute inset-0 items-center justify-center">
                <ActivityIndicator color={colors.navy} />
              </View>
            )}
            onShouldStartLoadWithRequest={(req) => {
              if (/^(https?|about|data|blob):/i.test(req.url)) return true;
              // UPI / wallet intent: open the installed app instead of the WebView.
              Linking.openURL(req.url).catch(() => {});
              return false;
            }}
            onError={() =>
              finish({ status: 'failed', message: 'Could not reach the payment page. Check your connection and try again.' })
            }
          />
        ) : null}
      </View>
    </Modal>
  );
}
