module crowdfunding::crowd {
    use sui::tx_context::{TxContext, sender};
    use sui::object::{Self as object, UID, ID};
    use sui::sui::SUI;
    use sui::coin::{Self as coin, Coin};
    use sui::balance::{Self as balance, Balance};
    use sui::transfer;
    use sui::event;
    use sui::clock::{Self as clock, Clock};

    /// ---------- Constants ----------
    const STATE_ACTIVE: u8 = 0;
    const STATE_SUCCEEDED: u8 = 1;
    const STATE_FAILED: u8 = 2;
    
    const MIN_GOAL_AMOUNT: u64 = 100_000_000; // 0.1 SUI
    const MAX_GOAL_AMOUNT: u64 = 1_000_000_000_000_000; // 1M SUI
    const MIN_DONATION: u64 = 10_000_000; // 0.01 SUI
    const MAX_DONATION: u64 = 100_000_000_000_000; // 100K SUI

    /// ---------- Error Codes ----------
    const E_INVALID_GOAL: u64 = 0;
    const E_INVALID_DEADLINE: u64 = 1;
    const E_NOT_ACTIVE: u64 = 2;
    const E_DEADLINE_NOT_REACHED: u64 = 3;
    const E_INVALID_AMOUNT: u64 = 4;
    const E_ALREADY_FINALIZED: u64 = 5;
    const E_DEADLINE_PASSED: u64 = 6;
    const E_NOT_SUCCEEDED: u64 = 7;
    const E_NOT_OWNER: u64 = 8;
    const E_NOT_FAILED: u64 = 9;
    const E_INSUFFICIENT_BALANCE: u64 = 10;
    const E_ALREADY_WITHDRAWN: u64 = 11;
    const E_MIN_DONATION_NOT_MET: u64 = 15;
    const E_MAX_DONATION_EXCEEDED: u64 = 16;

    /// ---------- Data Structures ----------
    /// Shared object: holds escrowed funds and campaign metadata.
    struct Campaign has key {
        id: UID,
        owner: address,
        goal: u64,
        deadline_ms: u64,
        raised: u64,
        state: u8,
        treasury: Balance<SUI>,
        metadata_cid: vector<u8>,
        donors_count: u64,
        withdrawn: bool,
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
    struct CampaignCreated has copy, drop { 
        campaign: ID, 
        owner: address, 
        goal: u64, 
        deadline_ms: u64 
    }
    
    struct Donated has copy, drop { 
        campaign: ID, 
        donor: address, 
        amount: u64, 
        ts_ms: u64 
    }
    
    struct Finalized has copy, drop { 
        campaign: ID, 
        state: u8, 
        raised: u64 
    }
    
    struct Withdrawn has copy, drop { 
        campaign: ID, 
        to: address, 
        amount: u64 
    }
    
    struct Refunded has copy, drop { 
        campaign: ID, 
        to: address, 
        amount: u64 
    }

    /// ---------- Entry Functions ----------
    /// Create a campaign with validation
    public entry fun create_campaign(
        goal: u64,
        deadline_ms: u64,
        cid: vector<u8>,
        ctx: &mut TxContext
    ) {
        // Input validation
        assert!(goal >= MIN_GOAL_AMOUNT, E_INVALID_GOAL);
        assert!(goal <= MAX_GOAL_AMOUNT, E_INVALID_GOAL);
        assert!(deadline_ms > 0, E_INVALID_DEADLINE);

        let c = Campaign {
            id: object::new(ctx),
            owner: sender(ctx),
            goal,
            deadline_ms,
            raised: 0,
            state: STATE_ACTIVE,
            treasury: balance::zero<SUI>(),
            metadata_cid: cid,
            donors_count: 0,
            withdrawn: false,
        };

        let id = object::uid_to_inner(&c.id);
        event::emit(CampaignCreated {
            campaign: id,
            owner: c.owner,
            goal: c.goal,
            deadline_ms: c.deadline_ms
        });

        transfer::share_object(c);
    }

    /// Donate to an active campaign with validation
    public entry fun donate(
        c: &mut Campaign,
        coins: Coin<SUI>,
        clk: &Clock,
        ctx: &mut TxContext
    ) {
        // Check campaign is active
        assert!(c.state == STATE_ACTIVE, E_NOT_ACTIVE);
        
        // Check deadline hasn't passed
        let now = clock::timestamp_ms(clk);
        assert!(now < c.deadline_ms, E_DEADLINE_PASSED);

        // Validate donation amount
        let amount = coin::value(&coins);
        assert!(amount >= MIN_DONATION, E_MIN_DONATION_NOT_MET);
        assert!(amount <= MAX_DONATION, E_MAX_DONATION_EXCEEDED);

        // Move coin into escrowed balance
        let bal = coin::into_balance(coins);
        balance::join(&mut c.treasury, bal);
        c.raised = c.raised + amount;
        c.donors_count = c.donors_count + 1;

        // Mint receipt to donor
        let receipt = DonationReceipt {
            id: object::new(ctx),
            campaign: object::uid_to_inner(&c.id),
            donor: sender(ctx),
            amount,
            ts_ms: now,
        };
        
        event::emit(Donated { 
            campaign: receipt.campaign, 
            donor: receipt.donor, 
            amount, 
            ts_ms: now 
        });
        
        transfer::public_transfer(receipt, sender(ctx));
    }

    /// Finalize campaign after deadline
    public entry fun finalize(
        c: &mut Campaign,
        clk: &Clock
    ) {
        // Check not already finalized
        assert!(c.state == STATE_ACTIVE, E_ALREADY_FINALIZED);
        
        // Check deadline has passed
        let now = clock::timestamp_ms(clk);
        assert!(now >= c.deadline_ms, E_DEADLINE_NOT_REACHED);

        // Set state based on goal achievement
        if (c.raised >= c.goal) {
            c.state = STATE_SUCCEEDED;
        } else {
            c.state = STATE_FAILED;
        };

        event::emit(Finalized { 
            campaign: object::uid_to_inner(&c.id), 
            state: c.state, 
            raised: c.raised 
        });
    }

    /// Withdraw funds (only for succeeded campaigns by owner)
    public entry fun withdraw(
        c: &mut Campaign,
        ctx: &mut TxContext
    ) {
        // Check campaign succeeded
        assert!(c.state == STATE_SUCCEEDED, E_NOT_SUCCEEDED);
        
        // Check sender is owner
        assert!(sender(ctx) == c.owner, E_NOT_OWNER);
        
        // Check not already withdrawn
        assert!(!c.withdrawn, E_ALREADY_WITHDRAWN);

        let amt = balance::value(&c.treasury);
        if (amt == 0) { 
            return 
        };

        // Mark as withdrawn BEFORE transferring (prevent re-entrancy)
        c.withdrawn = true;

        // Transfer funds to owner
        let payout: Balance<SUI> = balance::split(&mut c.treasury, amt);
        let coin_out: Coin<SUI> = coin::from_balance(payout, ctx);

        event::emit(Withdrawn { 
            campaign: object::uid_to_inner(&c.id), 
            to: c.owner, 
            amount: amt 
        });
        
        transfer::public_transfer(coin_out, c.owner);
    }

    /// Refund donation (only for failed campaigns)
    public entry fun refund(
        c: &mut Campaign,
        receipt: DonationReceipt,
        ctx: &mut TxContext
    ) {
        // Check campaign failed
        assert!(c.state == STATE_FAILED, E_NOT_FAILED);

        let to = receipt.donor;
        let amount = receipt.amount;

        // Burn receipt (prevents double refund)
        let DonationReceipt { id, campaign: _, donor: _, amount: _, ts_ms: _ } = receipt;
        object::delete(id);

        // Check treasury has sufficient balance
        assert!(balance::value(&c.treasury) >= amount, E_INSUFFICIENT_BALANCE);
        
        // Transfer refund
        let refund_bal: Balance<SUI> = balance::split(&mut c.treasury, amount);
        let coin_out: Coin<SUI> = coin::from_balance(refund_bal, ctx);

        event::emit(Refunded { 
            campaign: object::uid_to_inner(&c.id), 
            to, 
            amount 
        });
        
        transfer::public_transfer(coin_out, to);
    }

    /// ---------- Testing Functions ----------
    /// Force campaign to succeed for testing purposes (owner only)
    public entry fun force_succeeded(
        c: &mut Campaign,
        ctx: &mut TxContext
    ) {
        // Check sender is owner (for security)
        assert!(sender(ctx) == c.owner, E_NOT_OWNER);
        
        // Check not already finalized
        assert!(c.state == STATE_ACTIVE, E_ALREADY_FINALIZED);

        // Force success regardless of goal
        c.state = STATE_SUCCEEDED;

        event::emit(Finalized { 
            campaign: object::uid_to_inner(&c.id), 
            state: c.state, 
            raised: c.raised 
        });
    }
}