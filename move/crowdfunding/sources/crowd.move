module crowdfunding::crowd {
    use sui::tx_context::{TxContext, sender};
    use sui::object::{Self as Obj, UID, ID};
    use sui::sui::SUI;
    use sui::coin::{Self as Coin, Coin as SuiCoin};
    use sui::balance::{Self as Balance, Balance as SuiBalance};
    use sui::transfer;
    use sui::event;
    use sui::clock::{Self as Clock, Clock as SuiClock};

    /// ---------- Constants ----------
    const STATE_ACTIVE: u8 = 0;
    const STATE_SUCCEEDED: u8 = 1;
    const STATE_FAILED: u8 = 2;

    /// ---------- Data Structures ----------
    /// Shared object: holds escrowed funds and campaign metadata.
    struct Campaign has key {
        id: UID,
        owner: address,
        goal: u64,
        deadline_ms: u64,
        raised: u64,
        state: u8,
        treasury: SuiBalance<SUI>,   // escrowed SUI
        metadata_cid: vector<u8>,    // IPFS CID bytes
    }

    /// NFT-like receipt for a donation.
    struct DonationReceipt has key, store {
        id: UID,
        campaign: ID,
        donor: address,
        amount: u64,
        ts_ms: u64,
    }

    /// ---------- Events ----------
    struct CampaignCreated has copy, drop { campaign: ID, owner: address, goal: u64, deadline_ms: u64 }
    struct Donated         has copy, drop { campaign: ID, donor: address, amount: u64, ts_ms: u64 }
    struct Finalized       has copy, drop { campaign: ID, state: u8, raised: u64 }
    struct Withdrawn       has copy, drop { campaign: ID, to: address, amount: u64 }
    struct Refunded        has copy, drop { campaign: ID, to: address, amount: u64 }

    /// ---------- Entry Functions ----------
    /// Create a campaign; becomes a shared object.
    public entry fun create_campaign(
        goal: u64,
        deadline_ms: u64,
        cid: vector<u8>,
        ctx: &mut TxContext
    ) {
        assert!(goal > 0, 0);
        assert!(deadline_ms > 0, 1);

        let c = Campaign {
            id: Obj::new(ctx),
            owner: sender(ctx),
            goal,
            deadline_ms,
            raised: 0,
            state: STATE_ACTIVE,
            treasury: Balance::zero<SUI>(),
            metadata_cid: cid,
        };

        let id = Obj::uid_to_inner(&c.id);
        event::emit(CampaignCreated { campaign: id, owner: c.owner, goal: c.goal, deadline_ms: c.deadline_ms });

        // Share so anyone can donate.
        transfer::share_object(c);
    }

    /// Donate SUI to an active campaign. Mints a receipt to donor.
    public entry fun donate(
        c: &mut Campaign,
        mut coins: SuiCoin<SUI>,
        clock: &SuiClock,
        ctx: &mut TxContext
    ) {
        assert!(c.state == STATE_ACTIVE, 2);
        let now = Clock::timestamp_ms(clock);
        assert!(now < c.deadline_ms, 3);

        let amount = Coin::value(&coins);
        assert!(amount > 0, 4);

        // Move coin into escrowed balance
        let bal = Coin::into_balance(coins);
        Balance::join(&mut c.treasury, bal);
        c.raised = c.raised + amount;

        // Mint receipt to donor
        let receipt = DonationReceipt {
            id: Obj::new(ctx),
            campaign: Obj::uid_to_inner(&c.id),
            donor: sender(ctx),
            amount,
            ts_ms: now,
        };
        event::emit(Donated { campaign: receipt.campaign, donor: receipt.donor, amount, ts_ms: now });
        transfer::public_transfer(receipt, sender(ctx));
    }

    /// Finalize after the deadline; sets Succeeded/Failed.
    public entry fun finalize(
        c: &mut Campaign,
        clock: &SuiClock
    ) {
        assert!(c.state == STATE_ACTIVE, 5);
        let now = Clock::timestamp_ms(clock);
        assert!(now >= c.deadline_ms, 6);

        if (c.raised >= c.goal) {
            c.state = STATE_SUCCEEDED;
        } else {
            c.state = STATE_FAILED;
        }
        event::emit(Finalized { campaign: Obj::uid_to_inner(&c.id), state: c.state, raised: c.raised });
    }

    /// Withdraw all funds to owner (only if succeeded).
    public entry fun withdraw(
        c: &mut Campaign,
        ctx: &mut TxContext
    ) {
        assert!(c.state == STATE_SUCCEEDED, 7);
        assert!(sender(ctx) == c.owner, 8);

        let amt = Balance::value(&c.treasury);
        if (amt == 0) { return; };

        // Split full amount out of treasury, convert to Coin, transfer
        let (payout, remain) = Balance::split(&mut c.treasury, amt);
        c.treasury = remain;
        let coin = Coin::from_balance(payout, ctx);

        event::emit(Withdrawn { campaign: Obj::uid_to_inner(&c.id), to: c.owner, amount: amt });
        transfer::public_transfer(coin, c.owner);
    }

    /// Refund the donor using their receipt (only if failed). Burns the receipt.
    public entry fun refund(
        c: &mut Campaign,
        receipt: DonationReceipt,
        ctx: &mut TxContext
    ) {
        assert!(c.state == STATE_FAILED, 9);

        let to = sender(ctx);
        let amount = receipt.amount;

        // Burn receipt
        let DonationReceipt { id, campaign: _, donor: _, amount: _, ts_ms: _ } = receipt;
        Obj::delete(id);

        // Pay back from treasury
        assert!(Balance::value(&c.treasury) >= amount, 10);
        let (refund_bal, remain) = Balance::split(&mut c.treasury, amount);
        c.treasury = remain;
        let coin = Coin::from_balance(refund_bal, ctx);

        event::emit(Refunded { campaign: Obj::uid_to_inner(&c.id), to, amount });
        transfer::public_transfer(coin, to);
    }
}
