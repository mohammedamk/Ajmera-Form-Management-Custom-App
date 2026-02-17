import { useAppBridge } from "@shopify/app-bridge-react";

export default function Index() {
  return (
    <s-page heading="Forms Manager">
      <div style={{ marginTop: '8rem' }}>
        <s-section heading="Welcome to Forms Manager 👋">
          <s-text>
            <s-text type="strong">Forms Manager</s-text> is a Shopify App that automates the management of service inquiries, product inquiries, and callback requests.
          </s-text>
        </s-section>
        <div style={{ marginTop: '1rem' }}></div>
        <s-section heading="Core Capabilities">
          <s-text type="strong">
            This app automates the management of:
          </s-text>
          <div style={{ marginTop: '0.3rem' }}></div>
          <s-unordered-list>
            <s-list-item>
              <s-text type="strong">Contact Us:</s-text> Organize support tickets and general inquiries.
            </s-list-item>
            <s-list-item>
              <s-text type="strong">Product Inquiry:</s-text> Track high-intent leads directly from product pages.
            </s-list-item>
            <s-list-item>
              <s-text type="strong">Service Inquiry:</s-text> Collect and manage customer service requests.
            </s-list-item>
            <s-list-item>
              <s-text type="strong">Career Page:</s-text> Collect and manage job applications. and more.
            </s-list-item>
          </s-unordered-list>
        </s-section>
      </div>
    </s-page>
  );
}