const StarNotary = artifacts.require("StarNotary");

var accounts;
var owner;

describe("StarNotary Contract", () => {
    
    contract('StarNotary', (accs) => {
        accounts = accs;
        owner = accounts[0];
    });

    describe("constructor()", () => {
        it('should set the correct name', async() => {
            const instance = await StarNotary.deployed();
            const name = await instance.name({from: accounts[0]})
            assert.equal(name, 'StarNotary')
        });

        it('should set the correct symbol', async() => {
            const instance = await StarNotary.deployed();
            const symbol = await instance.symbol({from: accounts[0]})
            assert.equal(symbol, 'SNT')
        });
    });
    
    describe("createStar()", () => {
        it('should create star', async() => {
            const tokenId = 1;
            const instance = await StarNotary.deployed();
            await instance.createStar('Awesome Star!', tokenId, {from: accounts[0]})
            assert.equal(await instance.tokenIdToStarInfo.call(tokenId), 'Awesome Star!')
        });
    });

    describe("putStarUpForSale()", () => {
        it('should be able to get star price after putting up for sale', async() => {
            const instance = await StarNotary.deployed();
            const user1 = accounts[1];
            const starId = 2;
            const starPrice = web3.utils.toWei(".01", "ether");
            await instance.createStar('awesome star', starId, {from: user1});
            await instance.putStarUpForSale(starId, starPrice, {from: user1});
            assert.equal(await instance.starsForSale.call(starId), starPrice);
        });
    });

    describe("buyStar()", () => {
        it('should increase balance of user selling the star equal to star price', async() => {
            const instance = await StarNotary.deployed();
            const user1 = accounts[1];
            const user2 = accounts[2];
            const starId = 3;
            const starPrice = web3.utils.toWei(".01", "ether");
            const balance = web3.utils.toWei(".05", "ether");
            await instance.createStar('awesome star', starId, {from: user1});
            await instance.putStarUpForSale(starId, starPrice, {from: user1});
            const balanceOfUser1BeforeTransaction = await web3.eth.getBalance(user1);
            await instance.buyStar(starId, {from: user2, value: balance});
            const balanceOfUser1AfterTransaction = await web3.eth.getBalance(user1);
            const value1 = Number(balanceOfUser1BeforeTransaction) + Number(starPrice);
            const value2 = Number(balanceOfUser1AfterTransaction);
            assert.equal(value1, value2);
        });

        it('should decrease balance from user buying star equal to star price (plus gas fee)', async() => {
            const instance = await StarNotary.deployed();
            const user1 = accounts[1];
            const user2 = accounts[2];
            const starId = 5;
            const starPrice = web3.utils.toWei(".01", "ether");
            const gasPrice = web3.utils.toWei(".000001", "ether");
            const maxFee = "300000000";
            const maxFeeInWei =  web3.utils.toWei(maxFee, "gwei");
            const maxTotalCost = Number(starPrice) + Number(maxFeeInWei);
            await instance.createStar('awesome star', starId, {from: user1});
            await instance.putStarUpForSale(starId, starPrice, {from: user1});
            const balanceOfUser2BeforeTransaction = await web3.eth.getBalance(user2);
            await instance.buyStar(starId, {from: user2, value: starPrice, maxFeePerGas: maxFee});
            
            const balanceAfterUser2AfterBuysStar = await web3.eth.getBalance(user2);
            const user2BalanceChange = Number(balanceOfUser2BeforeTransaction) - Number(balanceAfterUser2AfterBuysStar);
           
            expect(user2BalanceChange).to.be.greaterThan(Number(starPrice ) - 1);
            expect(user2BalanceChange).to.be.lessThan(maxTotalCost);
          });
    });

    describe("lookUptokenIdToStarInfo()", () => {
        it('should return the starname by tokenId', async() => {
            const instance = await StarNotary.deployed();
            const user1 = accounts[1];
            const starId = 6;
            const starPrice = web3.utils.toWei(".01", "ether");
            const starName = 'awesome star';
            await instance.createStar(starName, starId, {from: user1});
            const startNameFromLookup = await instance.lookUptokenIdToStarInfo(starId);
            assert.equal(starName, startNameFromLookup);
        });

        it('should return empty string if star does not exist', async() => {
            const instance = await StarNotary.deployed();
            const starId = 667;
            const starName = '';
            const startNameFromLookup = await instance.lookUptokenIdToStarInfo(starId);
            assert.equal(starName, startNameFromLookup);
        });
    });

    describe("exchangeStars()", () => {
        it('should exchange stars if sender owns one of the stars', async() => {
            const instance = await StarNotary.deployed();
            const user1 = accounts[1];
            const user2 = accounts[2];
            const starId1 = 21;
            const starId2 = 22;
            await instance.createStar('awesome star 1', starId1, {from: user1});
            await instance.createStar('awesome star 2', starId2, {from: user2});

            await instance.exchangeStars(starId1, starId2, {from: user1});
            
            assert.equal(await instance.ownerOf(starId1), user2);
            assert.equal(await instance.ownerOf(starId2), user1);
        });

        it('should not exchange stars if sender does not own one of stars', async() => {
            const instance = await StarNotary.deployed();
            const user1 = accounts[1];
            const user2 = accounts[2];
            const starId1 = 23;
            const starId2 = 24;
            await instance.createStar('awesome star 1', starId1, {from: user1});
            await instance.createStar('awesome star 2', starId2, {from: user1});

            const expectedError = "Sender must own star for _tokenId1 or _tokenId2!";
            let actualError = "";
            try
            {
                await instance.exchangeStars(starId1, starId2, {from: user2});
            }
            catch (e)  {
                actualError = e.reason;
            };

            assert.equal(actualError, expectedError);
        });
    });

    describe("transferStar()", () => {
        it('should transfer a star owned by the sender to another address', async() => {
            const instance = await StarNotary.deployed();
            const user1 = accounts[1];
            const user2 = accounts[2];
            const starId = 31;
            
            await instance.createStar('awesome star 1', starId, {from: user1});
            await instance.transferStar(user2, starId, {from: user1});
            
            assert.equal(await instance.ownerOf(starId), user2);
        });

        it('should not transfer star if sender does not own the star', async() => {
            const instance = await StarNotary.deployed();
            const user1 = accounts[1];
            const user2 = accounts[2];
            const starId = 32;
            
            await instance.createStar('awesome star 1', starId, {from: user1});

            const expectedError = "Sender must own star for tokenId!";
            let actualError = "";
            try
            {
                await instance.transferStar(user1, starId, {from: user2});
            }
            catch (e)  {
                actualError = e.reason;
            };

            assert.equal(actualError, expectedError);
        });
    });
});
