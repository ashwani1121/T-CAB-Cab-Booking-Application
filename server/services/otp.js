const axios               = require('axios');
const sendSMS             = async (mobile, otp) => {
    try{
        const serviceName = "BozzoCab";
        const message     = `Your ${serviceName} OTP for verification is: ${otp}. OTP is confidential, refrain from sharing it with anyone. By Edumarc Technologies`;
        const fullMobile  = `91${mobile}`;
        const response    = await axios.post("https://smsapi.edumarcsms.com/api/v1/sendsms",
            {
                number: [fullMobile],
                message: message,
                senderId: "EDUMRC",
                templateId: "1707168926925165526",
            },
            {
                headers: {
                    apikey: process.env.COMBIRDS_OTP_KEY,
                    "Content-Type": "application/json",
                }
            }
        );
        console.log('SMS Response:', response.data);
        return response.data;
    }catch(error){
        console.error('SMS Send Error:', error.response?.data || error.message);
        throw new Error(
            error.response?.data?.message || 
            `Failed to send SMS: ${error.message}`
        );
    }
};
module.exports = { sendSMS };