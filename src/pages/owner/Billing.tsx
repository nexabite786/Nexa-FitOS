import React, { useEffect, useState } from 'react';
import { useTenantStore } from '../../store/tenantStore';
import { useEntitlements } from '../../lib/entitlements';
import { Button } from '../../components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../../components/ui/card';
import { CheckCircle2, CreditCard, AlertCircle, Loader2 } from 'lucide-react';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { format } from 'date-fns';

interface BillingState {
  status: string;
  providerSubscriptionId?: string;
  cancelAtPeriodEnd?: boolean;
  currentPeriodEnd?: string;
  planId?: string;
}

export function BillingPage() {
  const { tenantId, tenantData } = useTenantStore();
  const { currentPlanId, subscriptionStatus, getMaxClients, getMaxTrainers } = useEntitlements();
  const [loading, setLoading] = useState(false);
  const [billingState, setBillingState] = useState<BillingState | null>(null);
  const [billingHistory, setBillingHistory] = useState<any[]>([]);

  useEffect(() => {
    if (!tenantId) return;

    const fetchBillingData = async () => {
      setLoading(true);
      try {
        // Fetch current subscription status from source of truth
        const subSnapshot = await getDocs(
          query(collection(db, 'tenants', tenantId as string, 'billing'), limit(1))
        );
        
        if (!subSnapshot.empty) {
          const subData = subSnapshot.docs[0].data();
          setBillingState(subData as BillingState);
        }

        // Fetch billing history (events/invoices if any)
        const eventsSnapshot = await getDocs(
          query(collection(db, 'tenants', tenantId as string, 'billingEvents'), orderBy('processedAt', 'desc'), limit(5))
        );
        setBillingHistory(eventsSnapshot.docs.map(d => d.data()));
      } catch (error) {
        console.error('Error fetching billing data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBillingData();
  }, [tenantId]);

  const handleSubscribe = async (planId: string) => {
    if (!tenantId) return;
    setLoading(true);
    
    try {
      const response = await fetch('/api/billing/create-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId,
          planId // Valid Razorpay Plan ID
        })
      });
      
      const data = await response.json();
      
      if (data.subscriptionId && data.key) {
        const options = {
          key: data.key,
          subscription_id: data.subscriptionId,
          name: "NEXA FITOS",
          description: "SaaS Subscription",
          handler: function (response: any) {
            // Success handler
            alert(`Payment successful! Payment ID: ${response.razorpay_payment_id}`);
            // Force a reload to fetch new state from server which should be updated by webhook
            setTimeout(() => window.location.reload(), 2000);
          },
          theme: {
            color: "#FFB020" // Primary brand color
          }
        };

        const rzp = new (window as any).Razorpay(options);
        rzp.on('payment.failed', function (response: any) {
          console.error('Payment failed:', response.error);
          alert('Payment failed. Please try again.');
        });
        rzp.open();
      } else {
        throw new Error(data.error || 'Failed to create subscription session');
      }
    } catch (error) {
      console.error(error);
      alert('Failed to initiate checkout. Check console for details.');
    } finally {
      setLoading(false);
    }
  };

  const renderPlanCard = (id: string, name: string, price: string, limits: string, features: string[], isCurrent: boolean) => (
    <Card className={`relative ${isCurrent ? 'border-primary ring-1 ring-primary' : 'border-border'}`}>
      {isCurrent && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full">
          CURRENT PLAN
        </div>
      )}
      <CardHeader>
        <CardTitle className="text-2xl font-display">{name}</CardTitle>
        <CardDescription>
          <span className="text-3xl font-bold text-foreground">{price}</span> / mo
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm font-medium text-foreground">{limits}</p>
        <ul className="space-y-2">
          {features.map((f, i) => (
            <li key={i} className="flex items-center text-sm text-muted-foreground">
              <CheckCircle2 className="w-4 h-4 mr-2 text-primary" />
              {f}
            </li>
          ))}
        </ul>
      </CardContent>
      <CardFooter>
        <Button 
          className="w-full" 
          variant={isCurrent ? "outline" : "default"} 
          disabled={isCurrent || loading}
          onClick={() => handleSubscribe(id)}
        >
          {isCurrent ? 'Active' : 'Upgrade'}
        </Button>
      </CardFooter>
    </Card>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-5xl pb-12">
      <div>
        <h1 className="text-4xl font-display font-semibold tracking-tight text-foreground">Billing & Subscription</h1>
        <p className="text-muted-foreground mt-2 text-lg">Manage your plan, limits, and payment methods.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Current Subscription</CardTitle>
            <CardDescription>You are currently on the {currentPlanId.toUpperCase()} plan.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-secondary/50 rounded-lg border border-border">
              <div className="flex items-center space-x-4">
                <div className={`p-2 rounded-full ${subscriptionStatus === 'ACTIVE' || subscriptionStatus === 'TRIALING' ? 'bg-green-500/10 text-green-500' : 'bg-yellow-500/10 text-yellow-500'}`}>
                  {subscriptionStatus === 'ACTIVE' ? <CheckCircle2 className="w-6 h-6" /> : <AlertCircle className="w-6 h-6" />}
                </div>
                <div>
                  <p className="font-medium text-foreground">Status: {subscriptionStatus}</p>
                  {billingState?.currentPeriodEnd && (
                    <p className="text-sm text-muted-foreground">Renews on {format(new Date(billingState.currentPeriodEnd), 'MMM d, yyyy')}</p>
                  )}
                </div>
              </div>
              {billingState?.cancelAtPeriodEnd && (
                <span className="text-xs text-red-500 font-medium">Cancels at period end</span>
              )}
            </div>

            <div className="space-y-2 mt-6">
              <h4 className="text-sm font-medium uppercase text-muted-foreground tracking-wider">Usage</h4>
              <div className="space-y-3">
                <div className="flex justify-between items-center text-sm border-b border-border/50 pb-2">
                  <span className="text-muted-foreground">Client Capacity</span>
                  <span className="font-medium text-foreground">{getMaxClients() === 999999 ? 'Unlimited' : getMaxClients()}</span>
                </div>
                <div className="flex justify-between items-center text-sm border-b border-border/50 pb-2">
                  <span className="text-muted-foreground">Coach Capacity</span>
                  <span className="font-medium text-foreground">{getMaxTrainers() === 999999 ? 'Unlimited' : getMaxTrainers()}</span>
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-end border-t border-border/50 pt-6 mt-4 gap-3">
            <Button variant="outline" disabled={loading || subscriptionStatus !== 'ACTIVE'}>
              Manage Payment Methods
            </Button>
            <Button variant="destructive" disabled={loading || subscriptionStatus !== 'ACTIVE'}>
              Cancel Plan
            </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Billing History</CardTitle>
            <CardDescription>Recent transactions</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center p-4"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
            ) : billingHistory.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No recent billing events.</p>
            ) : (
              <ul className="space-y-4">
                {billingHistory.map((ev, idx) => (
                  <li key={idx} className="flex justify-between items-center text-sm">
                    <div>
                      <p className="font-medium">{ev.type}</p>
                      <p className="text-xs text-muted-foreground">{format(new Date(ev.processedAt), 'MMM d, yyyy')}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="pt-8 space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-display font-semibold">Available Plans</h2>
          <p className="text-muted-foreground mt-2">Upgrade to unlock more features and capacity.</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {renderPlanCard(
            'plan_essential', // Razorpay Plan ID
            'Essential',
            '$49',
            'Up to 50 Clients',
            ['Basic Client Management', 'Workout Builder', 'Standard Support'],
            currentPlanId === 'essential'
          )}
          {renderPlanCard(
            'plan_pro',
            'Pro',
            '$99',
            'Up to 500 Clients',
            ['Everything in Essential', 'Custom Branding', 'Advanced Analytics', 'Priority Support'],
            currentPlanId === 'pro'
          )}
          {renderPlanCard(
            'plan_elite',
            'Elite',
            '$199',
            'Unlimited Clients',
            ['Everything in Pro', 'API Access', 'Dedicated Account Manager'],
            currentPlanId === 'elite'
          )}
        </div>
      </div>
    </div>
  );
}
