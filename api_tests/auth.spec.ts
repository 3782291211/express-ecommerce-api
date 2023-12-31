import request from "supertest";
import app from '../index';
import { expect } from "chai";
import bcrypt from 'bcrypt';
import { cookie, setupFunction } from "./index.spec";
import prisma from "../prisma/prisma";

const authTests = () => {
  describe('Authorisation and authentication tests', () => {
    describe('/api/login', () => {
      beforeEach(setupFunction);
      
      it('Login response contains Set-Cookie header with session id.', async () => {
        type Customer = { 
          name: string,
          username: string,
          email: string
        };
  
        const { body: { customer } }:
          { body: { customer: Customer } } = await request(app)
          .post('/api/login')
          .send({
            username: "alexnes",
            password: "password"
          })
          .expect(200)
          .expect('Set-Cookie', /connect.sid=.+/);
      
        expect(customer).to.deep.equal({
          "id": 1,
          "name": "Alex Nes",
          "username": "alexnes",
          "email": "alex-nes@nexus.pk",
          "joinDate": "2021-11-16T23:27:52.223Z",
          "phone": null,
          "billingAddressId": 7,
          "shippingAddressId": 8,
          "avatar": null,
          "password": "**********"
        });
      });
  
      it('Incorrect username or password returns 401 response.', async () => {
        const { body: invalidUsername401 }: ApiErrorResponse = await request(app)
          .post('/api/login')
          .send({
            username: "alexnesX",
            password: "password"
          })
          .expect(401);
        
        expect(invalidUsername401.error.info).to.equal('Invalid username.');
  
        const { body: invalidPassword401 }: ApiErrorResponse = await request(app)
          .post('/api/login')
          .send({
            username: "alexnes",
            password: "passwordX"
          })
          .expect(401);
      
        expect(invalidPassword401.error.info).to.equal('Invalid password.');
      })
    });

    describe('/api/signup', () => {
      beforeEach(setupFunction);

      it('Customer can sign up for a new account.', async () => {
        const { body: { customer } }: 
        { body: { customer: Customer } } = await request(app)
          .post('/api/signup')
          .send({
            name: "Kal Varrick",
            email: "kvarrick@taliphus.ga",
            username: 'kvarrick3000',
            password: '89hgfb73jf'
          })
          .expect(201);
      
        expect(customer).to.be.an('object').that.has.all.keys('id', 'name', 'username', 'password', 'email', 'joinDate', 'billingAddressId', 'shippingAddressId', 'phone', 'avatar');
        expect(customer.id).to.equal(7);
        expect(customer.name).to.equal('Kal Varrick');
        expect(customer.username).to.equal('kvarrick3000');
        expect(customer.email).to.equal('kvarrick@taliphus.ga');
  
        const newCustomer = await prisma.customer.findUnique({ where: { id: 7 } });
        const matchedPassword = await bcrypt.compare('89hgfb73jf', newCustomer!.password!);
        expect(matchedPassword).to.be.true;
      });

      it("Signing up also automatically logs in the new user.", async () => {
        const signupResponse = await request(app)
        .post('/api/signup')
        .send({
          name: "Kal Varrick",
          email: "kvarrick@taliphus.ga",
          username: 'kvarrick3000',
          password: '89hgfb73jf'
        })
        .expect(201);

        const { body: customer }: { body: Customer } = await request(app)
          .get("/api/customers/7")
          .set("Cookie", signupResponse.headers['set-cookie'])
          .expect(200);
          
        expect(customer).to.have.property("id").that.is.equal(7);
        expect(customer).to.have.property("name").that.is.equal("Kal Varrick");
        expect(customer).to.have.property("username").that.is.equal("kvarrick3000");
      });

      it("SSO enables user to create and sign in to new account.", async () => {
        const ssoResponse = await request(app)
        .post('/api/sso')
        .send({
          name: "Kal Varrick",
          email: "kvarrick@gmail.com",
          authId: '9872360182323',
          provider: "Google"
        })
        .expect(201);

        const { body: customer }: { body: Customer } = await request(app)
          .get("/api/customers/7")
          .set("Cookie", ssoResponse.headers['set-cookie'])
          .expect(200);
          
        expect(customer).to.have.property("id").that.is.equal(7);
        expect(customer).to.have.property("name").that.is.equal("Kal Varrick");
        expect(customer).to.have.property("username").that.is.equal("kvarrick@gmail.com");
        expect(customer).to.have.property("oAuth").that.is.deep.equal({
          "authId": "9872360182323",
          "customerId": 7,
          "provider": "Google"
        });
      });
  
      it('Rejects attempts to sign up using an existing username or email.', async () => {
        const { body: firstErrorResponse }: ApiErrorResponse = await request(app)
          .post('/api/signup')
          .send({
            name: "Marcus Boone",
            email: "boone@raza.dm",
            username: "alexnes",
            password: "password"
          })
          .expect(400);
  
        expect(firstErrorResponse.error.info).to.equal('That username is taken.');
  
        const { body: secondErrorResponse }: ApiErrorResponse = await request(app)
          .post('/api/signup')
          .send({
            name: "Marcus Boone",
            email: "alex-nes@nexus.pk",
            username: "marcus_boone433",
            password: "password"
          })
          .expect(400);
  
        expect(secondErrorResponse.error.info).to.equal('Email already in use.');
      });

      it('Signup rejects request body if it is missing a required field.', async () => {
        const { body: errorResponse }: ApiErrorResponse = await request(app)
        .post('/api/signup')
        .send({
          name: "Marcus Boone",
          username: "marcus_boone433",
          password: "password"
        })
        .expect(400);

      expect(errorResponse.error.info).to.equal('Request body is missing required field(s).');
      });

      it('SSO rejects request body if it is missing a required field.', async () => {
        const { body: errorResponse }: ApiErrorResponse = await request(app)
        .post('/api/sso')
        .send({
          name: "Marcus Boone",
          username: "marcus_boone433",
          email: "123@gmail.com",
          authId: "1234",
          providers: "Google"
        })
        .expect(400);

      expect(errorResponse.error.info).to.equal('Request body is missing required field(s).');
      });

      it('Rejects request body if it contains invalid data type.', async () => {
        const { body: errorResponse }: ApiErrorResponse = await request(app)
        .post('/api/signup')
        .send({
          name: 123,
          email: "alex-nes@nexus.pk",
          username: "marcus_boone433",
          password: "password"
        })
        .expect(400);

      expect(errorResponse.error.info).to.equal('Request body fields must all be in string format.');
      });
    });

    describe('/api/logout', () => {
      const agent = request.agent(app);
    
      it('Logs user out.', async () => {
        await agent.post('/api/login')
          .send({
            username: "alexnes",
            password: "password"
          })
          .expect('set-cookie', /connect.sid=.+\sSameSite=None/);
    
        const response = await agent.post('/api/logout')
          .expect(200);
        
        expect(response.body.msg).to.equal('alexnes is now logged out.');
      });
    
      it('Rejects unauthenticated access.', async () => {
        const { body: logoutResponse }: ApiErrorResponse = await request(app)
          .post('/api/logout')
          .expect(401);
        
        expect(logoutResponse.error.info).to.equal('Unauthenticated.');
      })
    });

    describe('Authenticated routes.', () => {
      it('GET /api/customers/:customerId forbids unauthenticated access.', async () => {
        const { body: errorResponse }: ApiErrorResponse = await request(app)
          .get('/api/customers/1')
          .expect(401);
        
        expect(errorResponse.error.info).to.equal('Unauthenticated.');
      });

      it('PUT /api/customers/:customerId forbids unauthenticated access.', async () => {
        const { body: errorResponse }: ApiErrorResponse = await request(app)
          .put('/api/customers/1')
          .expect(401);
        
        expect(errorResponse.error.info).to.equal('Unauthenticated.');
      });

      it('DELETE /api/customers/:customerId forbids unauthenticated access.', async () => {
        const { body: errorResponse }: ApiErrorResponse = await request(app)
          .delete('/api/customers/1')
          .expect(401);
        
        expect(errorResponse.error.info).to.equal('Unauthenticated.');
      });

      it('GET /api/customers/:customerId/orders forbids unauthenticated access.', async () => {
        const { body: errorResponse }: ApiErrorResponse = await request(app)
          .get('/api/customers/1/orders')
          .expect(401);
        
        expect(errorResponse.error.info).to.equal('Unauthenticated.');
      });

      it('POST /api/customers/:customerId/orders forbids unauthenticated access.', async () => {
        const { body: errorResponse }: ApiErrorResponse = await request(app)
          .post('/api/customers/1/orders')
          .expect(401);
        
        expect(errorResponse.error.info).to.equal('Unauthenticated.');
      });

      it('GET /api/customers/:customerId/orders/:orderId forbids unauthenticated access.', async () => {
        const { body: errorResponse }: ApiErrorResponse = await request(app)
          .get('/api/customers/1/orders/21')
          .expect(401);
        
        expect(errorResponse.error.info).to.equal('Unauthenticated.');
      });

      it('GET /api/customers/:customerId/cart forbids unauthenticated access.', async () => {
        const { body: errorResponse }: ApiErrorResponse = await request(app)
          .get('/api/customers/1/cart')
          .expect(401);
        
        expect(errorResponse.error.info).to.equal('Unauthenticated.');
      });

      it('PUT /api/customers/:customerId/cart forbids unauthenticated access.', async () => {
        const { body: errorResponse }: ApiErrorResponse = await request(app)
          .put('/api/customers/1/cart')
          .expect(401);
        
        expect(errorResponse.error.info).to.equal('Unauthenticated.');
      });

      it('GET /api/customers/:customerId/wishlist forbids unauthenticated access.', async () => {
        const { body: errorResponse }: ApiErrorResponse = await request(app)
          .get('/api/customers/1/wishlist')
          .expect(401);
        
        expect(errorResponse.error.info).to.equal('Unauthenticated.');
      });

      it('PUT /api/customers/:customerId/wishlist forbids unauthenticated access.', async () => {
        const { body: errorResponse }: ApiErrorResponse = await request(app)
          .put('/api/customers/1/wishlist')
          .expect(401);
        
        expect(errorResponse.error.info).to.equal('Unauthenticated.');
      });

      it('GET /api/customers/:id/favorites forbids unauthenticated access.', async () => {
        const { body: errorResponse }: ApiErrorResponse = await request(app)
          .put('/api/customers/1/favorites')
          .expect(401);
        
        expect(errorResponse.error.info).to.equal('Unauthenticated.');
      });

      it('POST /api/reviews/ forbids unauthenticated access.', async () => {
        const { body: errorResponse }: ApiErrorResponse = await request(app)
          .post('/api/reviews')
          .expect(401);
        
        expect(errorResponse.error.info).to.equal('Unauthenticated.');
      });

      it('PUT /api/reviews/:reviewId forbids unauthenticated access.', async () => {
        const { body: errorResponse }: ApiErrorResponse = await request(app)
          .put('/api/reviews/1')
          .expect(401);
        
        expect(errorResponse.error.info).to.equal('Unauthenticated.');
      });

      it('DELETE /api/reviews/:reviewId forbids unauthenticated access.', async () => {
        const { body: errorResponse }: ApiErrorResponse = await request(app)
          .delete('/api/reviews/1')
          .expect(401);
        
        expect(errorResponse.error.info).to.equal('Unauthenticated.');
      });

      it('POST /api/customers/:id/addresses forbids unauthenticated access.', async () => {
        const { body: errorResponse }: ApiErrorResponse = await request(app)
          .post('/api/customers/1/addresses')
          .expect(401);
        
        expect(errorResponse.error.info).to.equal('Unauthenticated.');
      });

      it('DELETE /api/customers/:id/addresses/:id forbids unauthenticated access.', async () => {
        const { body: errorResponse }: ApiErrorResponse = await request(app)
          .delete('/api/customers/1/addresses/8')
          .expect(401);
        
        expect(errorResponse.error.info).to.equal('Unauthenticated.');
      });
    });

    describe('Authorised routes.', () => {
      it('GET /api/customers/:customerId forbids unauthorised access.', async () => {
        const { body: errorResponse }: ApiErrorResponse = await request(app)
          .get('/api/customers/3')
          .set('Cookie', cookie)
          .expect(403);
        
        expect(errorResponse.error.info).to.equal('Unauthorised.');
      });

      it('PUT /api/customers/:customerId forbids unauthorised access.', async () => {
        const { body: errorResponse }: ApiErrorResponse = await request(app)
          .put('/api/customers/3')
          .set('Cookie', cookie)
          .expect(403);
        
        expect(errorResponse.error.info).to.equal('Unauthorised.');
      });

      it('DELETE /api/customers/:customerId forbids unauthorised access.', async () => {
        const { body: errorResponse }: ApiErrorResponse = await request(app)
          .delete('/api/customers/3')
          .set('Cookie', cookie)
          .expect(403);
        
        expect(errorResponse.error.info).to.equal('Unauthorised.');
      });

      it('GET /api/customers/:customerId/orders forbids unauthorised access.', async () => {
        const { body: errorResponse }: ApiErrorResponse = await request(app)
          .get('/api/customers/3/orders')
          .set('Cookie', cookie)
          .expect(403);
        
        expect(errorResponse.error.info).to.equal('Unauthorised.');
      });

      it('GET /api/customers/:customerId/cart forbids unauthorised access.', async () => {
        const { body: errorResponse }: ApiErrorResponse = await request(app)
          .get('/api/customers/3/cart')
          .set('Cookie', cookie)
          .expect(403);
        
        expect(errorResponse.error.info).to.equal('Unauthorised.');
      });

      it('PUT /api/reviews/:reviewId forbids user from modifying another customer\'s review.', async () => {
        const { body: errorResponse }: ApiErrorResponse = await request(app)
          .put('/api/reviews/14')
          .set('Cookie', cookie)
          .expect(403);
        
        expect(errorResponse.error.info).to.equal('Unauthorised.');
      });

      it('DELETE /api/reviews/:reviewId forbids user from deleting another customer\'s review.', async () => {
        const { body: errorResponse }: ApiErrorResponse = await request(app)
          .delete('/api/reviews/7')
          .set('Cookie', cookie)
          .expect(403);
        
        expect(errorResponse.error.info).to.equal('Unauthorised.');
      });

    });
  });
}

export default authTests;