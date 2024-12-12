const mongoose = require('mongoose')
const {Schema} = mongoose;

const walletSchema = new mongoose.Schema(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        balance: {
            type: Number,
            required: true,
            default: 0,
        },
        transactions: [
            {
                type: {
                    type: String,
                    enum: ['credit', 'debit', 'refund'], 
                    required: true,
                },
                amount: {
                    type: Number,
                    required: true,
                },
                description: {
                    type: String,
                },
                createdAt: {
                    type: Date,
                    default: Date.now,
                },
            },
        ],
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model('Wallet', walletSchema);