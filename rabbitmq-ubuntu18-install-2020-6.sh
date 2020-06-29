#!/bin/sh

## If sudo is not available on the system,
## uncomment the line below to install it
# apt-get install -y sudo

# configuration

# ip address of box to install on
IP_ADDRESS=ip.of.server.installation

# rabbit username (admin)
USERNAME=username

# rabbit admin password
PASSWORD=changeme

# CA Keyfile Password
CERTIFICATE_PASSWORD=changeme

sudo apt-get update -y

## Install prerequisites
sudo apt-get install curl gnupg -y

## Install RabbitMQ signing key
curl -fsSL https://github.com/rabbitmq/signing-keys/releases/download/2.0/rabbitmq-release-signing-key.asc | sudo apt-key add -

## Install apt HTTPS transport
sudo apt-get install apt-transport-https

## Add Bintray repositories that provision latest RabbitMQ and Erlang 23.x releases
sudo tee /etc/apt/sources.list.d/bintray.rabbitmq.list <<EOF
## Installs the latest Erlang 23.x release.
## Change component to "erlang-22.x" to install the latest 22.x version.
## "bionic" as distribution name should work for any later Ubuntu or Debian release.
## See the release to distribution mapping table in RabbitMQ doc guides to learn more.
deb https://dl.bintray.com/rabbitmq-erlang/debian bionic erlang
## Installs latest RabbitMQ release
deb https://dl.bintray.com/rabbitmq/debian bionic main
EOF

## Update package indices
sudo apt-get update -y

## Install rabbitmq-server and its dependencies
sudo apt-get install rabbitmq-server -y --fix-missing

sudo service rabbitmq-server start
sudo rabbitmq-plugins enable rabbitmq_management
sudo rabbitmqctl add_user "$USERNAME" "$PASSWORD"
sudo rabbitmqctl set_user_tags "$USERNAME" administrator
sudo rabbitmqctl set_permissions -p / "$USERNAME" ".*" ".*" ".*"
sudo rabbitmqctl delete_user guest
sudo service rabbitmq-server restart

# generate self signed cert bundle
git clone https://github.com/michaelklishin/tls-gen tls-gen
cd tls-gen/basic
echo "IP.1 = $IP_ADDRESS" >> ./openssl.cnf
apt install make
make PASSWORD="$CERTIFICATE_PASSWORD"
make verify
make info
ls -l ./result
mkdir -p /etc/rabbitmq/certs
mv ./result/* /etc/rabbitmq/certs

cd /etc/rabbitmq

chown rabbitmq:rabbitmq /etc/rabbitmq/certs/*

echo """
listeners.ssl.default = 5671
ssl_options.cacertfile = /etc/rabbitmq/certs/ca_certificate.pem
ssl_options.certfile   = /etc/rabbitmq/certs/server_certificate.pem
ssl_options.keyfile    = /etc/rabbitmq/certs/server_key.pem
ssl_options.verify     = verify_peer
ssl_options.fail_if_no_peer_cert = true
ssl_options.password   = $CERTIFICATE_PASSWORD
management.ssl.port       = 15671
management.ssl.cacertfile = /etc/rabbitmq/certs/ca_certificate.pem
management.ssl.certfile   = /etc/rabbitmq/certs/server_certificate.pem
management.ssl.keyfile    = /etc/rabbitmq/certs/server_key.pem
management.ssl.password   = $CERTIFICATE_PASSWORD
""" > rabbitmq.conf

sudo service rabbitmq-server restart

echo """
If all went well with the above, TLS is now enabled with a self-signed
certificate.
Copy the 3 client certificate files and the ca_certificate file to the app you want to connect with:
scp root@$IP_ADDRESS:/etc/rabbitmq/certs/* ./
"""

echo "If you don't want to enable nginx go ahead and Ctrl + c to exit the script"

sleep 10

# install nginx
sudo apt install nginx -y

sudo systemctl enable nginx
sudo systemctl start nginx

echo "$CERTIFICATE_PASSWORD" > /etc/rabbitmq/certs/pass

echo """
server
 {        
        listen 443 ssl;
        ssl_certificate /etc/rabbitmq/certs/server_certificate.pem;
        ssl_certificate_key /etc/rabbitmq/certs/server_key.pem;
        ssl_password_file /etc/rabbitmq/certs/pass;
        root /var/www/html;
        index index.html index.htm index.nginx-debian.html;
        server_name _s;
        location / {
        proxy_pass https://localhost:15671;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
server {
  listen 80;
  server_name _;
  return 301 https://$IP_ADDRESS;
}
""" > /etc/nginx/sites-enabled/default

sudo systemctl restart nginx
