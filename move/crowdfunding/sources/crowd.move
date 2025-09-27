module crowdfunding::crowd {
    use sui::tx_context::TxContext;
    use sui::object::UID;
    use sui::balance::Balance;
    use sui::coin::Coin;
    use sui::event;
    use sui::transfer;
    use sui::sui::SUI; // ✅ This fixes the “unbound type 'SUI'” error

    const STATE_ACTIVE: u8 = 0;
    const STATE_SUCCEEDED: u8 = 1;
    const STATE_FAILED: u8 = 2;

    struct Campaign has key {
        id: UID,
        owner: address,
        goal: u64,
        deadline_ms: u64,
        raised: u64,
        state: u8,
        treasury: Balance<SUI>,
        metadata_cid: vector<u8>,
    }

    struct DonationReceipt has key, store {
        id: UID,
        campaign: address,
        donor: address,
        amount: u64,
        ts_ms: u64,
    }

    // Events...
    struct CampaignCreated has copy, drop { campaign: address, owner: address, goal: u64, deadline_ms: u64 }
    struct Donated has copy, drop { campaign: address, donor: address, amount: u64 }
    struct Finalized has copy, drop { campaign: address, state: u8, raised: u64 }
    struct Withdrawn has copy, drop { campaign: address, to: address, amount: u64 }
    struct Refunded has copy, drop { campaign: address, to: address, amount: u64 }

    public entry fun create_campaign(goal: u64, deadline_ms: u64, cid: vector<u8>, ctx: &mut TxContext) {
        // TODO
    }

    public entry fun donate(c: &mut Campaign, coins: Coin<SUI>, ctx: &mut TxContext) {
        // TODO
    }

    public entry fun finalize(c: &mut Campaign, ctx: &mut TxContext) {
        // TODO
    }

    public entry fun withdraw(c: &mut Campaign, ctx: &mut TxContext) {
        // TODO
    }

    public entry fun refund(c: &mut Campaign, receipt: DonationReceipt, ctx: &mut TxContext) {
        // TODO
    }
}
