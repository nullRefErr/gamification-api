import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { AccountService } from './account.service';
import { Account } from '../schemas/account.schema';

@Injectable()
export class SubscriptionService {
  private stripe: Stripe;
  private readonly proPriceId: string;
  private readonly enterprisePriceId: string;

  constructor(
    private readonly accountService: AccountService,
    private readonly configService: ConfigService,
  ) {
    const stripeSecretKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    if (!stripeSecretKey) {
      console.warn('STRIPE_SECRET_KEY not configured. Subscription features will be limited.');
    }

    this.stripe = new Stripe(stripeSecretKey || 'sk_test_placeholder', {
      apiVersion: '2024-12-18.acacia',
    });

    this.proPriceId = this.configService.get<string>('STRIPE_PRO_PRICE_ID') || '';
    this.enterprisePriceId = this.configService.get<string>('STRIPE_ENTERPRISE_PRICE_ID') || '';
  }

  /**
   * Create Stripe customer for account
   */
  async createCustomer(account: Account): Promise<string> {
    if (account.subscription.stripeCustomerId) {
      return account.subscription.stripeCustomerId;
    }

    const customer = await this.stripe.customers.create({
      email: account.email,
      name: `${account.firstName} ${account.lastName}`,
      metadata: {
        accountId: account.id,
      },
    });

    // Update account with Stripe customer ID
    account.subscription.stripeCustomerId = customer.id;
    await account.save();

    return customer.id;
  }

  /**
   * Create checkout session for subscription
   */
  async createCheckoutSession(
    accountId: string,
    tier: 'pro' | 'enterprise',
    successUrl: string,
    cancelUrl: string
  ): Promise<{ sessionId: string; url: string }> {
    const account = await this.accountService.findByIdOrThrow(accountId);

    // Ensure customer exists
    const customerId = await this.createCustomer(account);

    // Get price ID based on tier
    const priceId = tier === 'pro' ? this.proPriceId : this.enterprisePriceId;

    if (!priceId) {
      throw new BadRequestException(`Price ID for ${tier} tier not configured`);
    }

    // Create checkout session
    const session = await this.stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        accountId: account.id,
        tier,
      },
    });

    return {
      sessionId: session.id,
      url: session.url || '',
    };
  }

  /**
   * Handle successful checkout
   */
  async handleCheckoutSuccess(sessionId: string): Promise<void> {
    const session = await this.stripe.checkout.sessions.retrieve(sessionId);

    if (!session.metadata?.accountId) {
      throw new BadRequestException('No account ID in session metadata');
    }

    const account = await this.accountService.findByIdOrThrow(session.metadata.accountId);

    // Update subscription
    account.subscription.tier = session.metadata.tier as any;
    account.subscription.status = 'active';
    account.subscription.stripeSubscriptionId = session.subscription as string;
    account.subscription.currentPeriodStart = new Date();
    account.subscription.currentPeriodEnd = new Date();
    account.subscription.currentPeriodEnd.setMonth(account.subscription.currentPeriodEnd.getMonth() + 1);

    await account.save();
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(accountId: string): Promise<void> {
    const account = await this.accountService.findByIdOrThrow(accountId);

    if (!account.subscription.stripeSubscriptionId) {
      throw new BadRequestException('No active subscription found');
    }

    // Cancel at period end (not immediately)
    await this.stripe.subscriptions.update(account.subscription.stripeSubscriptionId, {
      cancel_at_period_end: true,
    });

    account.subscription.cancelAtPeriodEnd = true;
    await account.save();
  }

  /**
   * Reactivate cancelled subscription
   */
  async reactivateSubscription(accountId: string): Promise<void> {
    const account = await this.accountService.findByIdOrThrow(accountId);

    if (!account.subscription.stripeSubscriptionId) {
      throw new BadRequestException('No subscription found');
    }

    if (!account.subscription.cancelAtPeriodEnd) {
      throw new BadRequestException('Subscription is not cancelled');
    }

    // Reactivate subscription
    await this.stripe.subscriptions.update(account.subscription.stripeSubscriptionId, {
      cancel_at_period_end: false,
    });

    account.subscription.cancelAtPeriodEnd = false;
    await account.save();
  }

  /**
   * Get subscription details
   */
  async getSubscriptionDetails(accountId: string): Promise<any> {
    const account = await this.accountService.findByIdOrThrow(accountId);

    let stripeSubscription = null;
    if (account.subscription.stripeSubscriptionId) {
      try {
        stripeSubscription = await this.stripe.subscriptions.retrieve(
          account.subscription.stripeSubscriptionId
        );
      } catch (error) {
        console.error('Error fetching Stripe subscription:', error);
      }
    }

    return {
      tier: account.subscription.tier,
      status: account.subscription.status,
      currentPeriodStart: account.subscription.currentPeriodStart,
      currentPeriodEnd: account.subscription.currentPeriodEnd,
      cancelAtPeriodEnd: account.subscription.cancelAtPeriodEnd,
      stripeSubscription: stripeSubscription ? {
        id: stripeSubscription.id,
        status: stripeSubscription.status,
        currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
        currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
        cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
      } : null,
    };
  }

  /**
   * Handle Stripe webhook events
   */
  async handleWebhookEvent(event: Stripe.Event): Promise<void> {
    switch (event.type) {
      case 'checkout.session.completed':
        const session = event.data.object as Stripe.Checkout.Session;
        await this.handleCheckoutSuccess(session.id);
        break;

      case 'customer.subscription.updated':
        const subscription = event.data.object as Stripe.Subscription;
        await this.handleSubscriptionUpdated(subscription);
        break;

      case 'customer.subscription.deleted':
        const deletedSubscription = event.data.object as Stripe.Subscription;
        await this.handleSubscriptionDeleted(deletedSubscription);
        break;

      case 'invoice.payment_succeeded':
        const invoice = event.data.object as Stripe.Invoice;
        await this.handlePaymentSucceeded(invoice);
        break;

      case 'invoice.payment_failed':
        const failedInvoice = event.data.object as Stripe.Invoice;
        await this.handlePaymentFailed(failedInvoice);
        break;

      default:
        console.log(`Unhandled webhook event type: ${event.type}`);
    }
  }

  private async handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
    const customerId = subscription.customer as string;
    const customer = await this.stripe.customers.retrieve(customerId);

    if (!customer.deleted && customer.metadata?.accountId) {
      const account = await this.accountService.findById(customer.metadata.accountId);
      if (account) {
        account.subscription.status = subscription.status as any;
        account.subscription.currentPeriodStart = new Date(subscription.current_period_start * 1000);
        account.subscription.currentPeriodEnd = new Date(subscription.current_period_end * 1000);
        account.subscription.cancelAtPeriodEnd = subscription.cancel_at_period_end;
        await account.save();
      }
    }
  }

  private async handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
    const customerId = subscription.customer as string;
    const customer = await this.stripe.customers.retrieve(customerId);

    if (!customer.deleted && customer.metadata?.accountId) {
      const account = await this.accountService.findById(customer.metadata.accountId);
      if (account) {
        account.subscription.tier = 'free';
        account.subscription.status = 'cancelled';
        account.subscription.stripeSubscriptionId = undefined;
        account.subscription.cancelAtPeriodEnd = false;
        await account.save();
      }
    }
  }

  private async handlePaymentSucceeded(invoice: Stripe.Invoice): Promise<void> {
    // Payment succeeded - subscription remains active
    console.log(`Payment succeeded for invoice: ${invoice.id}`);
  }

  private async handlePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
    const customerId = invoice.customer as string;
    const customer = await this.stripe.customers.retrieve(customerId);

    if (!customer.deleted && customer.metadata?.accountId) {
      const account = await this.accountService.findById(customer.metadata.accountId);
      if (account) {
        // Mark subscription as past due
        account.subscription.status = 'past_due';
        await account.save();

        // Could send email notification here
        console.log(`Payment failed for account: ${account.id}`);
      }
    }
  }
}
