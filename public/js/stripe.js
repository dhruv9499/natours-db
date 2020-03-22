/* disable-eslint */
import axios from 'axios';
import { showAlert } from './alert';

export const bookTour = async tourId => {
  const stripe = Stripe('pk_test_mAVYxUqQF3V074Z6gOmM5cca00Iezsc5hE');
  try {
    // 1) Get checkOut session form API
    const res = await axios({
      method: 'GET',
      url: `http://127.0.0.1:3000/api/v1/booking/checkout-session/${tourId}`
    });
    console.log(res);
    // 2) Create checkOut form + charge credit card
    await stripe.redirectToCheckout({
      sessionId: res.data.session.id
    });
  } catch (err) {
    console.log(err);
    showAlert('error', err);
  }
};
