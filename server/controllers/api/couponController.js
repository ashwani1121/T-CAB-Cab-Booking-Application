const { Coupon } = require('../../models');
const couponController = {
    // Get coupons based on the user
    getCoupons: async (req, res) => {
        try {
            if (!req.user || !req.user.userId) {
                return res.status(401).json({
                    success: false,
                    message: 'Unauthorized: User not authenticated'
                });
            }
            const userId = req.user.userId;
            const couponList = await Coupon.findAll({
                attributes: ['id', 'code', 'coupon_type', 'description', 'special_message'],
            });
            const formattedCoupons = couponList.map(coupon => ({
                id: coupon.id,
                code: coupon.code,
                type: coupon.coupon_type,
                description: coupon.description,
                special_message: coupon.special_message,
            }));
            res.status(200).json({
                success: true,
                message: formattedCoupons.length ? 'Coupons retrieved successfully' : 'No coupons available',
                data: formattedCoupons,
            });
        } catch (err) {
            console.error('getCoupons error:', err);
            res.status(500).json({
                success: false,
                message: 'Failed to retrieve coupons. Please try again later.'
            });
        }
    },
};

module.exports = couponController;