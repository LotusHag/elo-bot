const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    username: { type: String, unique: true, required: true },
    password: { type: String, required: true },
    playerIds: [{
        _id: false,
        refPath: 'playerModel',
        type: mongoose.Schema.Types.ObjectId
    }],
    playerModel: {
        type: String,
        required: true,
        enum: ['PlayerLOL', 'PlayerValo', 'PlayerRL']
    },
    role: { type: String, enum: ['user', 'general admin', 'head admin'], default: 'user' }
});

userSchema.methods.validPassword = function(password) {
    return bcrypt.compareSync(password, this.password);
};

userSchema.pre('save', function(next) {
    if (this.isModified('password') || this.isNew) {
        const salt = bcrypt.genSaltSync(10);
        this.password = bcrypt.hashSync(this.password, salt);
    }
    next();
});

module.exports = mongoose.model('User', userSchema);
