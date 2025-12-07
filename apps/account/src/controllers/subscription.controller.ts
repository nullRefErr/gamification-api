import { Controller, Get, Post, Body, UseGuards, Headers, RawBodyRequest, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiExcludeEndpoint } from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { CurrentAccount } from '../decorators/current-account.decorator';
import { Account } from '../schemas/account.schema';
import { SubscriptionService } from '../services/subscription.service';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

class CreateCheckoutSessionDto {
  tier: 'pro' | 'enterprise';
  successUrl: string;
  cancelUrl: string;
}

@ApiTags('Subscription Management')
@Controller('api/v1/accounts/subscription')
export class SubscriptionController {
  private stripe: Stripe;

  constructor(
    private readonly subscriptionService: SubscriptionService,
    private readonly configService: ConfigService,
  ) {
    const stripeSecretKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    this.stripe = new Stripe(stripeSecretKey || 'sk_test_placeholder', {
      apiVersion: '2024-12-18.acacia',
    });
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get subscription details' })
  @ApiResponse({ status: 200, description: 'Returns subscription information' })
  async getSubscription(@CurrentAccount() account: Account) {
    const details = await this.subscriptionService.getSubscriptionDetails(account.id);

    return {
      subscription: details,
    };
  }

  @Post('checkout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create Stripe checkout session for subscription' })
  @ApiResponse({
    status: 201,
    description: 'Returns checkout session URL',
    schema: {
      properties: {
        sessionId: { type: 'string' },
        url: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid tier or missing configuration' })
  async createCheckoutSession(
    @CurrentAccount() account: Account,
    @Body() createCheckoutDto: CreateCheckoutSessionDto
  ) {
    const result = await this.subscriptionService.createCheckoutSession(
      account.id,
      createCheckoutDto.tier,
      createCheckoutDto.successUrl,
      createCheckoutDto.cancelUrl
    );

    return result;
  }

  @Post('cancel')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cancel subscription (at period end)' })
  @ApiResponse({ status: 200, description: 'Subscription cancelled successfully' })
  @ApiResponse({ status: 400, description: 'No active subscription found' })
  async cancelSubscription(@CurrentAccount() account: Account) {
    await this.subscriptionService.cancelSubscription(account.id);

    return {
      message: 'Subscription will be cancelled at the end of the current billing period',
    };
  }

  @Post('reactivate')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reactivate cancelled subscription' })
  @ApiResponse({ status: 200, description: 'Subscription reactivated successfully' })
  @ApiResponse({ status: 400, description: 'Subscription is not cancelled' })
  async reactivateSubscription(@CurrentAccount() account: Account) {
    await this.subscriptionService.reactivateSubscription(account.id);

    return {
      message: 'Subscription has been reactivated',
    };
  }

  @Post('webhook')
  @ApiExcludeEndpoint()
  async handleWebhook(
    @Headers('stripe-signature') signature: string,
    @Req() req: RawBodyRequest<Request>
  ) {
    const webhookSecret = this.configService.get<string>('STRIPE_WEBHOOK_SECRET');

    if (!webhookSecret) {
      throw new Error('STRIPE_WEBHOOK_SECRET not configured');
    }

    let event: Stripe.Event;

    try {
      event = this.stripe.webhooks.constructEvent(
        req.rawBody || '',
        signature,
        webhookSecret
      );
    } catch (error) {
      console.error('Webhook signature verification failed:', error);
      throw new Error('Invalid webhook signature');
    }

    await this.subscriptionService.handleWebhookEvent(event);

    return { received: true };
  }
}
