#!/bin/sh

VERSION=${1:-latest}

# Download and extract desired schedulator version
wget -O /opt/schedulator/schedulator.zip https://github.com/PierreEVEN/schedulator/releases/$VERSION/download/schedulator_linux.zip
unzip /opt/schedulator/schedulator.zip -d /opt

# Install
chmod u+x /opt/schedulator/schedulator

# Cleanup
rm /opt/schedulator/schedulator.zip

sleep 1000

# Run
/opt/schedulator/schedulator