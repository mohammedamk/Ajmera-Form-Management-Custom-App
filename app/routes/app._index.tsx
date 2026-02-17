import { useAppBridge } from "@shopify/app-bridge-react";

export default function Index() {
  return (
    <s-page heading="Forms Manager">
      <div style={{ marginTop: '8rem' }}>
        <s-section>
          <s-text type="strong">Welcome to Forms Manager 👋 </s-text>
          <s-text type="strong">
            Centralize and track all customer interactions from a single dashboard.
          </s-text>
        </s-section>
        <div style={{ marginTop: '1rem' }}></div>
        <s-section heading="Core Capabilities">
          <s-text type="strong">
            This app automates the management of:
          </s-text>

          <s-unordered-list>
            <s-list-item>
              <s-text type="strong">Contact Us:</s-text> Organize support tickets and general inquiries.
            </s-list-item>
            <s-list-item>
              <s-text type="strong">Product Inquiry:</s-text> Track high-intent leads directly from product pages.
            </s-list-item>
            <s-list-item>
              <s-text type="strong">Campaigns:</s-text> Capture leads from landing pages and newsletters.
            </s-list-item>
          </s-unordered-list>
        </s-section>
      </div>
    </s-page>
  );
}